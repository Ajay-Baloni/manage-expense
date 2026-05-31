from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone

from .models import Category, Budget, BudgetAlert
from .serializers import CategorySerializer, BudgetSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CategorySerializer

    def get_queryset(self):
        user = self.request.user
        return Category.objects.filter(Q(user=user) | Q(user__isnull=True)).order_by('name')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.user is None:
            raise PermissionError('Cannot modify default categories')
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user is None:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Cannot delete default categories')
        instance.delete()


class BudgetViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BudgetSerializer

    def get_queryset(self):
        qs = Budget.objects.filter(user=self.request.user).select_related('category')
        month = self.request.query_params.get('month')
        if month:
            from datetime import date
            try:
                year, mon = month.split('-')
                qs = qs.filter(month=date(int(year), int(mon), 1))
            except (ValueError, AttributeError):
                pass
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def current_month(self, request):
        today = timezone.now().date()
        from datetime import date
        month_start = date(today.year, today.month, 1)
        budgets = Budget.objects.filter(user=request.user, month=month_start).select_related('category')
        serializer = self.get_serializer(budgets, many=True)
        return Response(serializer.data)
