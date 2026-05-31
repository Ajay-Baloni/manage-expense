from django.db import models
from django.conf import settings


class Category(models.Model):
    TYPE_CHOICES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
        ('both', 'Both'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        null=True, blank=True, related_name='categories'
    )
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, default='tag')
    color = models.CharField(max_length=7, default='#6366f1')
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='both')
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['type']),
        ]
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.type})"


class Budget(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='budgets')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='budgets')
    month = models.DateField()  # use first day of month
    limit_amount = models.DecimalField(max_digits=12, decimal_places=2)
    alert_threshold = models.IntegerField(default=80)  # percentage

    class Meta:
        unique_together = ['user', 'category', 'month']
        indexes = [
            models.Index(fields=['user', 'month']),
        ]

    def __str__(self):
        return f"Budget: {self.category.name} for {self.month.strftime('%Y-%m')}"


class BudgetAlert(models.Model):
    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name='alerts')
    triggered_at = models.DateTimeField(auto_now_add=True)
    percentage_used = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        ordering = ['-triggered_at']

    def __str__(self):
        return f"Alert: {self.budget} at {self.percentage_used}%"
