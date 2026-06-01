from rest_framework import serializers
from .models import Category, Budget, BudgetAlert


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'icon', 'color', 'type', 'is_default', 'created_at']
        read_only_fields = ['id', 'created_at', 'is_default']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class BudgetAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetAlert
        fields = ['id', 'triggered_at', 'percentage_used', 'level']


class BudgetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    alerts = BudgetAlertSerializer(many=True, read_only=True)
    spent_amount = serializers.SerializerMethodField()
    percentage_used = serializers.SerializerMethodField()
    period_start = serializers.SerializerMethodField()
    period_end = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            'id', 'category', 'category_name', 'category_color', 'category_icon',
            'period', 'month', 'limit_amount', 'alert_threshold',
            'spent_amount', 'percentage_used', 'period_start', 'period_end', 'alerts',
        ]
        read_only_fields = ['id', 'month']

    def get_spent_amount(self, obj):
        from apps.transactions.models import Transaction
        from django.db.models import Sum
        start, end = obj.current_period_range()
        total = Transaction.objects.filter(
            user=obj.user,
            category=obj.category,
            type='expense',
            date__gte=start,
            date__lte=end,
        ).aggregate(total=Sum('amount'))['total'] or 0
        return float(total)

    def get_percentage_used(self, obj):
        spent = self.get_spent_amount(obj)
        if obj.limit_amount > 0:
            return round(float(spent) / float(obj.limit_amount) * 100, 2)
        return 0

    def get_period_start(self, obj):
        return obj.current_period_range()[0]

    def get_period_end(self, obj):
        return obj.current_period_range()[1]

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
