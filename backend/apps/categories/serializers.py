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
        fields = ['id', 'triggered_at', 'percentage_used']


class BudgetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    alerts = BudgetAlertSerializer(many=True, read_only=True)
    spent_amount = serializers.SerializerMethodField()
    percentage_used = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            'id', 'category', 'category_name', 'category_color', 'category_icon',
            'month', 'limit_amount', 'alert_threshold',
            'spent_amount', 'percentage_used', 'alerts',
        ]
        read_only_fields = ['id']

    def get_spent_amount(self, obj):
        from apps.transactions.models import Transaction
        from django.db.models import Sum
        import calendar
        month = obj.month
        last_day = calendar.monthrange(month.year, month.month)[1]
        total = Transaction.objects.filter(
            user=obj.user,
            category=obj.category,
            type='expense',
            date__gte=month,
            date__lte=month.replace(day=last_day),
        ).aggregate(total=Sum('amount'))['total'] or 0
        return float(total)

    def get_percentage_used(self, obj):
        spent = self.get_spent_amount(obj)
        if obj.limit_amount > 0:
            return round(float(spent) / float(obj.limit_amount) * 100, 2)
        return 0

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
