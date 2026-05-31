from rest_framework import serializers
from .models import Transaction, Tag, RecurringRule
from apps.categories.serializers import CategorySerializer


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'color']
        read_only_fields = ['id']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class TransactionSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True, write_only=True, queryset=Tag.objects.none(),
        source='tags', required=False
    )
    category_detail = CategorySerializer(source='category', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'type', 'amount', 'category', 'category_detail',
            'date', 'description', 'tags', 'tag_ids',
            'receipt_url', 'receipt_file', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request:
            self.fields['tag_ids'].child_relation.queryset = Tag.objects.filter(user=request.user)

    def create(self, validated_data):
        tags = validated_data.pop('tags', [])
        validated_data['user'] = self.context['request'].user
        transaction = super().create(validated_data)
        transaction.tags.set(tags)
        return transaction

    def update(self, instance, validated_data):
        tags = validated_data.pop('tags', None)
        instance = super().update(instance, validated_data)
        if tags is not None:
            instance.tags.set(tags)
        return instance


class RecurringRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecurringRule
        fields = [
            'id', 'type', 'amount', 'category', 'description',
            'frequency', 'start_date', 'next_run', 'end_date', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'next_run']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data['next_run'] = validated_data['start_date']
        return super().create(validated_data)


class DashboardSummarySerializer(serializers.Serializer):
    total_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_expense = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    income_change_pct = serializers.FloatField()
    expense_change_pct = serializers.FloatField()
    monthly_breakdown = serializers.ListField()
    top_categories = serializers.ListField()
