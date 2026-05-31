from django.db import models
from django.conf import settings


class SplitGroup(models.Model):
    name = models.CharField(max_length=150)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_split_groups'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['created_by'])]

    def __str__(self):
        return self.name


class GuestUser(models.Model):
    name = models.CharField(max_length=150)
    email = models.EmailField(blank=True)

    def __str__(self):
        return self.name


class SplitGroupMember(models.Model):
    group = models.ForeignKey(SplitGroup, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        null=True, blank=True, related_name='split_memberships'
    )
    guest_user = models.ForeignKey(
        GuestUser, on_delete=models.CASCADE,
        null=True, blank=True, related_name='split_memberships'
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['group'])]

    def __str__(self):
        name = self.user.email if self.user else (self.guest_user.name if self.guest_user else 'Unknown')
        return f"{name} in {self.group.name}"

    @property
    def display_name(self):
        if self.user:
            return self.user.full_name or self.user.email
        if self.guest_user:
            return self.guest_user.name
        return 'Unknown'


class SplitExpense(models.Model):
    SPLIT_TYPE_CHOICES = [
        ('equal', 'Equal'),
        ('exact', 'Exact'),
        ('percentage', 'Percentage'),
        ('shares', 'Shares'),
    ]

    group = models.ForeignKey(SplitGroup, on_delete=models.CASCADE, related_name='expenses')
    paid_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='paid_split_expenses'
    )
    paid_by_guest = models.ForeignKey(
        GuestUser, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='paid_split_expenses'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=255)
    date = models.DateField()
    split_type = models.CharField(max_length=15, choices=SPLIT_TYPE_CHOICES, default='equal')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['group', 'date'])]
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.description}: {self.amount} in {self.group.name}"


class SplitExpenseShare(models.Model):
    expense = models.ForeignKey(SplitExpense, on_delete=models.CASCADE, related_name='shares')
    member = models.ForeignKey(SplitGroupMember, on_delete=models.CASCADE, related_name='shares')
    share_amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_settled = models.BooleanField(default=False)

    class Meta:
        indexes = [models.Index(fields=['expense', 'member'])]

    def __str__(self):
        return f"{self.member.display_name}: {self.share_amount}"


class SplitSettlement(models.Model):
    group = models.ForeignKey(SplitGroup, on_delete=models.CASCADE, related_name='settlements')
    payer_member = models.ForeignKey(
        SplitGroupMember, on_delete=models.CASCADE, related_name='settlements_paid'
    )
    receiver_member = models.ForeignKey(
        SplitGroupMember, on_delete=models.CASCADE, related_name='settlements_received'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    settled_at = models.DateTimeField(auto_now_add=True)
    note = models.CharField(max_length=255, blank=True)

    class Meta:
        indexes = [models.Index(fields=['group'])]

    def __str__(self):
        return f"{self.payer_member.display_name} paid {self.receiver_member.display_name}: {self.amount}"
