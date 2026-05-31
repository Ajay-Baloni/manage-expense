from django.core.management.base import BaseCommand
from apps.categories.models import Category

DEFAULT_CATEGORIES = [
    # Expense categories
    {'name': 'Food & Dining', 'icon': 'utensils', 'color': '#f97316', 'type': 'expense'},
    {'name': 'Transportation', 'icon': 'car', 'color': '#3b82f6', 'type': 'expense'},
    {'name': 'Shopping', 'icon': 'shopping-bag', 'color': '#8b5cf6', 'type': 'expense'},
    {'name': 'Entertainment', 'icon': 'film', 'color': '#ec4899', 'type': 'expense'},
    {'name': 'Healthcare', 'icon': 'heart', 'color': '#ef4444', 'type': 'expense'},
    {'name': 'Housing', 'icon': 'home', 'color': '#14b8a6', 'type': 'expense'},
    {'name': 'Utilities', 'icon': 'zap', 'color': '#eab308', 'type': 'expense'},
    {'name': 'Education', 'icon': 'book', 'color': '#6366f1', 'type': 'expense'},
    {'name': 'Travel', 'icon': 'plane', 'color': '#06b6d4', 'type': 'expense'},
    {'name': 'Personal Care', 'icon': 'user', 'color': '#f43f5e', 'type': 'expense'},
    {'name': 'Subscriptions', 'icon': 'repeat', 'color': '#a855f7', 'type': 'expense'},
    {'name': 'Other Expenses', 'icon': 'more-horizontal', 'color': '#64748b', 'type': 'expense'},
    # Income categories
    {'name': 'Salary', 'icon': 'briefcase', 'color': '#22c55e', 'type': 'income'},
    {'name': 'Freelance', 'icon': 'laptop', 'color': '#10b981', 'type': 'income'},
    {'name': 'Investment', 'icon': 'trending-up', 'color': '#84cc16', 'type': 'income'},
    {'name': 'Gift', 'icon': 'gift', 'color': '#f472b6', 'type': 'income'},
    {'name': 'Other Income', 'icon': 'plus-circle', 'color': '#4ade80', 'type': 'income'},
]


class Command(BaseCommand):
    help = 'Create default categories'

    def handle(self, *args, **options):
        created = 0
        for cat_data in DEFAULT_CATEGORIES:
            obj, was_created = Category.objects.get_or_create(
                name=cat_data['name'],
                user=None,
                defaults={**cat_data, 'is_default': True}
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f'Created {created} default categories'))
