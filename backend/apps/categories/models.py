from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import calendar


def period_range(period, today=None):
    """Return (start, end) dates for the current weekly or monthly period."""
    today = today or timezone.now().date()
    if period == 'weekly':
        start = today - timedelta(days=today.weekday())  # Monday
        end = start + timedelta(days=6)                   # Sunday
    else:  # monthly
        start = today.replace(day=1)
        last_day = calendar.monthrange(today.year, today.month)[1]
        end = today.replace(day=last_day)
    return start, end


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
    PERIOD_CHOICES = [('weekly', 'Weekly'), ('monthly', 'Monthly')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='budgets')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='budgets')
    period = models.CharField(max_length=10, choices=PERIOD_CHOICES, default='monthly')
    # Anchor date (first day of the month the budget was created). Budgets are
    # recurring: spend is always evaluated over the *current* period.
    month = models.DateField(blank=True)
    limit_amount = models.DecimalField(max_digits=12, decimal_places=2)
    alert_threshold = models.IntegerField(default=80)  # percentage

    class Meta:
        # One recurring budget per category per period (weekly/monthly).
        unique_together = ['user', 'category', 'period']
        indexes = [
            models.Index(fields=['user', 'period']),
        ]

    def save(self, *args, **kwargs):
        if not self.month:
            self.month = timezone.now().date().replace(day=1)
        super().save(*args, **kwargs)

    def current_period_range(self):
        return period_range(self.period)

    def __str__(self):
        return f"Budget: {self.category.name} ({self.period}) — {self.limit_amount}"


class BudgetAlert(models.Model):
    LEVEL_CHOICES = [('warning', 'Warning'), ('exceeded', 'Exceeded')]

    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name='alerts')
    triggered_at = models.DateTimeField(auto_now_add=True)
    percentage_used = models.DecimalField(max_digits=6, decimal_places=2)
    # Which period this alert was for, and at what level — used to avoid
    # sending the same alert more than once per period.
    period_start = models.DateField(null=True, blank=True)
    level = models.CharField(max_length=10, choices=LEVEL_CHOICES, default='warning')

    class Meta:
        ordering = ['-triggered_at']

    def __str__(self):
        return f"Alert: {self.budget} {self.level} at {self.percentage_used}%"
