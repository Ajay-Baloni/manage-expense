from django.db import models
from django.conf import settings


class Tag(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tags')
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default='#6366f1')

    class Meta:
        unique_together = ['user', 'name']
        indexes = [models.Index(fields=['user'])]

    def __str__(self):
        return self.name


class Transaction(models.Model):
    TYPE_CHOICES = [('income', 'Income'), ('expense', 'Expense')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions')
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.ForeignKey(
        'categories.Category', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='transactions'
    )
    date = models.DateField()
    description = models.CharField(max_length=255)
    tags = models.ManyToManyField(Tag, blank=True, related_name='transactions')
    receipt_url = models.URLField(blank=True)
    receipt_file = models.FileField(upload_to='receipts/', null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['user', 'type']),
            models.Index(fields=['user', 'category']),
            models.Index(fields=['date']),
        ]
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.type}: {self.amount} - {self.description}"


class RecurringRule(models.Model):
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recurring_rules')
    type = models.CharField(max_length=10, choices=Transaction.TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.ForeignKey(
        'categories.Category', on_delete=models.SET_NULL,
        null=True, blank=True
    )
    description = models.CharField(max_length=255)
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES)
    start_date = models.DateField()
    next_run = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['next_run']),
        ]

    def __str__(self):
        return f"Recurring {self.type}: {self.amount} - {self.description} ({self.frequency})"
