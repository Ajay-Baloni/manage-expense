from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import date, timedelta
import django_filters

from .models import Transaction, Tag, RecurringRule
from .serializers import (
    TransactionSerializer, TagSerializer,
    RecurringRuleSerializer, DashboardSummarySerializer
)


class TransactionFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='date', lookup_expr='lte')
    amount_min = django_filters.NumberFilter(field_name='amount', lookup_expr='gte')
    amount_max = django_filters.NumberFilter(field_name='amount', lookup_expr='lte')
    tags = django_filters.BaseInFilter(field_name='tags__id', lookup_expr='in')

    class Meta:
        model = Transaction
        fields = ['type', 'category', 'date_from', 'date_to', 'amount_min', 'amount_max', 'tags']


class TransactionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TransactionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TransactionFilter
    search_fields = ['description', 'notes']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date']

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).select_related('category').prefetch_related('tags')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def dashboard_summary(self, request):
        today = timezone.now().date()
        current_month_start = date(today.year, today.month, 1)
        if today.month == 1:
            prev_month_start = date(today.year - 1, 12, 1)
            prev_month_end = date(today.year, 1, 1) - timedelta(days=1)
        else:
            prev_month_start = date(today.year, today.month - 1, 1)
            prev_month_end = current_month_start - timedelta(days=1)

        user = request.user
        qs = Transaction.objects.filter(user=user)

        current = qs.filter(date__gte=current_month_start, date__lte=today)
        prev = qs.filter(date__gte=prev_month_start, date__lte=prev_month_end)

        current_income = float(current.filter(type='income').aggregate(t=Sum('amount'))['t'] or 0)
        current_expense = float(current.filter(type='expense').aggregate(t=Sum('amount'))['t'] or 0)
        prev_income = float(prev.filter(type='income').aggregate(t=Sum('amount'))['t'] or 0)
        prev_expense = float(prev.filter(type='expense').aggregate(t=Sum('amount'))['t'] or 0)

        def pct_change(current, prev):
            if prev == 0:
                return 100.0 if current > 0 else 0.0
            return round((current - prev) / prev * 100, 2)

        # Monthly breakdown last 6 months
        import calendar
        monthly_breakdown = []
        for i in range(5, -1, -1):
            # Walk back i whole months from the current month using month arithmetic
            total_month = (today.year * 12 + (today.month - 1)) - i
            ref_year = total_month // 12
            ref_month = total_month % 12 + 1
            m_start = date(ref_year, ref_month, 1)
            m_end = date(ref_year, ref_month, calendar.monthrange(ref_year, ref_month)[1])
            m_qs = qs.filter(date__gte=m_start, date__lte=m_end)
            monthly_breakdown.append({
                'month': m_start.strftime('%Y-%m'),
                'income': float(m_qs.filter(type='income').aggregate(t=Sum('amount'))['t'] or 0),
                'expense': float(m_qs.filter(type='expense').aggregate(t=Sum('amount'))['t'] or 0),
            })

        # Top expense categories current month
        top_cats = (
            current.filter(type='expense')
            .values('category__name', 'category__color', 'category__icon')
            .annotate(total=Sum('amount'))
            .order_by('-total')[:6]
        )
        top_categories = [
            {
                'name': c['category__name'] or 'Uncategorized',
                'color': c['category__color'] or '#64748b',
                'icon': c['category__icon'] or 'tag',
                'total': float(c['total']),
            }
            for c in top_cats
        ]

        return Response({
            'total_income': current_income,
            'total_expense': current_expense,
            'net_balance': current_income - current_expense,
            'income_change_pct': pct_change(current_income, prev_income),
            'expense_change_pct': pct_change(current_expense, prev_expense),
            'monthly_breakdown': monthly_breakdown,
            'top_categories': top_categories,
        })


class TagViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TagSerializer

    def get_queryset(self):
        return Tag.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class RecurringRuleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = RecurringRuleSerializer

    def get_queryset(self):
        return RecurringRule.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        start_date = serializer.validated_data.get('start_date')
        serializer.save(user=self.request.user, next_run=start_date)
