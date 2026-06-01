"""Budget threshold checking and alert emails.

Called whenever an expense transaction is created/updated. For each budget on
the affected category we compute spend over the current period and, if it has
crossed the alert threshold (warning) or the limit (exceeded), send an email —
at most once per period per level.
"""
import logging
from decimal import Decimal

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db.models import Sum
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from .models import Budget, BudgetAlert

logger = logging.getLogger(__name__)

CURRENCY_SYMBOLS = {
    'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CAD': 'C$',
}


def _spent_for_budget(budget, start, end):
    from apps.transactions.models import Transaction
    total = Transaction.objects.filter(
        user=budget.user,
        category=budget.category,
        type='expense',
        date__gte=start,
        date__lte=end,
    ).aggregate(total=Sum('amount'))['total']
    return Decimal(total or 0)


def check_budget_thresholds(user, category):
    """Check every budget for this user+category and email on threshold crossings."""
    budgets = Budget.objects.filter(user=user, category=category).select_related('category')
    for budget in budgets:
        try:
            _check_single_budget(user, budget)
        except Exception:  # never let alerting break the request
            logger.exception('Budget threshold check failed for budget %s', budget.id)


def _check_single_budget(user, budget):
    if budget.limit_amount <= 0:
        return

    start, end = budget.current_period_range()
    spent = _spent_for_budget(budget, start, end)
    pct = round(float(spent) / float(budget.limit_amount) * 100, 2)

    if pct >= 100:
        level = 'exceeded'
    elif pct >= budget.alert_threshold:
        level = 'warning'
    else:
        return  # below threshold, nothing to do

    # Dedup: one email per (budget, period, level).
    already_sent = BudgetAlert.objects.filter(
        budget=budget, period_start=start, level=level
    ).exists()
    if already_sent:
        return

    BudgetAlert.objects.create(
        budget=budget, percentage_used=pct, period_start=start, level=level,
    )
    _send_alert_email(user, budget, spent, pct, level, start, end)


def _send_alert_email(user, budget, spent, pct, level, start, end):
    if not user.email:
        return

    currency = getattr(getattr(user, 'profile', None), 'currency', 'INR') or 'INR'
    symbol = CURRENCY_SYMBOLS.get(currency, '')

    context = {
        'name': user.first_name or user.email,
        'category': budget.category.name,
        'period': budget.get_period_display().lower(),   # "weekly" / "monthly"
        'period_noun': 'week' if budget.period == 'weekly' else 'month',
        'limit': f'{symbol}{budget.limit_amount:,.2f}',
        'spent': f'{symbol}{spent:,.2f}',
        'remaining': f'{symbol}{max(budget.limit_amount - spent, 0):,.2f}',
        'pct': pct,
        'level': level,
        'period_start': start,
        'period_end': end,
    }

    if level == 'exceeded':
        subject = f'⚠️ Over budget: {budget.category.name}'
    else:
        subject = f'Heads up: {budget.category.name} budget at {pct:.0f}%'

    html_body = render_to_string('emails/budget_alert.html', context)
    text_body = strip_tags(render_to_string('emails/budget_alert.txt', context))

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    msg.attach_alternative(html_body, 'text/html')
    msg.send(fail_silently=False)
    logger.info('Sent %s budget alert to %s for %s', level, user.email, budget.category.name)
