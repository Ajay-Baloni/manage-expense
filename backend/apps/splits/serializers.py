from rest_framework import serializers
from .models import SplitGroup, GuestUser, SplitGroupMember, SplitExpense, SplitExpenseShare, SplitSettlement


class GuestUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestUser
        fields = ['id', 'name', 'email']


class SplitGroupMemberSerializer(serializers.ModelSerializer):
    display_name = serializers.ReadOnlyField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    guest_user_detail = GuestUserSerializer(source='guest_user', read_only=True)

    class Meta:
        model = SplitGroupMember
        fields = ['id', 'group', 'user', 'user_email', 'guest_user', 'guest_user_detail', 'display_name', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class SplitExpenseShareSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.display_name', read_only=True)

    class Meta:
        model = SplitExpenseShare
        fields = ['id', 'member', 'member_name', 'share_amount', 'is_settled']


class SplitExpenseSerializer(serializers.ModelSerializer):
    shares = SplitExpenseShareSerializer(many=True, read_only=True)
    paid_by_name = serializers.SerializerMethodField()
    shares_data = serializers.ListField(write_only=True, required=False)

    class Meta:
        model = SplitExpense
        fields = [
            'id', 'group', 'paid_by_user', 'paid_by_guest', 'paid_by_name',
            'amount', 'description', 'date', 'split_type', 'shares', 'shares_data', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_paid_by_name(self, obj):
        if obj.paid_by_user:
            return obj.paid_by_user.full_name or obj.paid_by_user.email
        if obj.paid_by_guest:
            return obj.paid_by_guest.name
        return 'Unknown'

    def validate(self, attrs):
        if not attrs.get('paid_by_user') and not attrs.get('paid_by_guest'):
            raise serializers.ValidationError(
                'An expense must have a payer: set either paid_by_user or paid_by_guest.'
            )
        return attrs

    def create(self, validated_data):
        shares_data = validated_data.pop('shares_data', [])
        expense = SplitExpense.objects.create(**validated_data)
        members = SplitGroupMember.objects.filter(group=expense.group)

        if not shares_data:
            # Equal split
            member_count = members.count()
            if member_count > 0:
                per_person = expense.amount / member_count
                for member in members:
                    SplitExpenseShare.objects.create(
                        expense=expense,
                        member=member,
                        share_amount=per_person,
                    )
        else:
            for share in shares_data:
                SplitExpenseShare.objects.create(
                    expense=expense,
                    member_id=share['member_id'],
                    share_amount=share['share_amount'],
                )
        return expense


class SplitGroupSerializer(serializers.ModelSerializer):
    members = SplitGroupMemberSerializer(many=True, read_only=True)
    expense_count = serializers.IntegerField(source='expenses.count', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)

    class Meta:
        model = SplitGroup
        fields = ['id', 'name', 'created_by', 'created_by_email', 'members', 'expense_count', 'created_at']
        read_only_fields = ['id', 'created_at', 'created_by']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        group = super().create(validated_data)
        # Add creator as member
        SplitGroupMember.objects.create(group=group, user=self.context['request'].user)
        return group


class SplitSettlementSerializer(serializers.ModelSerializer):
    payer_name = serializers.CharField(source='payer_member.display_name', read_only=True)
    receiver_name = serializers.CharField(source='receiver_member.display_name', read_only=True)

    class Meta:
        model = SplitSettlement
        fields = [
            'id', 'group', 'payer_member', 'payer_name',
            'receiver_member', 'receiver_name', 'amount', 'settled_at', 'note',
        ]
        read_only_fields = ['id', 'settled_at']
