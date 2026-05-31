from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from collections import defaultdict
from decimal import Decimal

from .models import SplitGroup, GuestUser, SplitGroupMember, SplitExpense, SplitExpenseShare, SplitSettlement
from .serializers import (
    SplitGroupSerializer, GuestUserSerializer, SplitGroupMemberSerializer,
    SplitExpenseSerializer, SplitSettlementSerializer
)


class SplitGroupViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SplitGroupSerializer

    def get_queryset(self):
        user = self.request.user
        return SplitGroup.objects.filter(
            Q(created_by=user) | Q(members__user=user)
        ).distinct().prefetch_related('members__user', 'members__guest_user')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        group = self.get_object()
        user_id = request.data.get('user_id')
        guest_data = request.data.get('guest_user')

        if user_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                user = User.objects.get(id=user_id)
                member, created = SplitGroupMember.objects.get_or_create(group=group, user=user)
                return Response(SplitGroupMemberSerializer(member).data)
            except User.DoesNotExist:
                return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        elif guest_data:
            guest = GuestUser.objects.create(**guest_data)
            member = SplitGroupMember.objects.create(group=group, guest_user=guest)
            return Response(SplitGroupMemberSerializer(member).data)
        return Response({'detail': 'Provide user_id or guest_user'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def balances(self, request, pk=None):
        group = self.get_object()
        members = SplitGroupMember.objects.filter(group=group)
        member_map = {m.id: m.display_name for m in members}

        # Net balance per member: amount_paid - share_owed
        net = defaultdict(Decimal)

        expenses = SplitExpense.objects.filter(group=group).prefetch_related('shares')
        for expense in expenses:
            # Credit the payer
            payer_member = members.filter(user=expense.paid_by_user).first() if expense.paid_by_user else \
                           members.filter(guest_user=expense.paid_by_guest).first()
            if payer_member:
                net[payer_member.id] += expense.amount
            # Debit each share
            for share in expense.shares.filter(is_settled=False):
                net[share.member_id] -= share.share_amount

        # Settlements
        for settlement in SplitSettlement.objects.filter(group=group):
            net[settlement.payer_member_id] -= settlement.amount
            net[settlement.receiver_member_id] += settlement.amount

        # Calculate who owes whom (greedy algorithm)
        debts = []
        positives = [(mid, bal) for mid, bal in net.items() if bal > 0]
        negatives = [(mid, -bal) for mid, bal in net.items() if bal < 0]

        i, j = 0, 0
        while i < len(positives) and j < len(negatives):
            creditor_id, credit = positives[i]
            debtor_id, debt = negatives[j]
            settle = min(credit, debt)
            debts.append({
                'from_member': debtor_id,
                'from_name': member_map.get(debtor_id, 'Unknown'),
                'to_member': creditor_id,
                'to_name': member_map.get(creditor_id, 'Unknown'),
                'amount': float(settle),
            })
            positives[i] = (creditor_id, credit - settle)
            negatives[j] = (debtor_id, debt - settle)
            if positives[i][1] == 0:
                i += 1
            if negatives[j][1] == 0:
                j += 1

        member_balances = [
            {
                'member_id': mid,
                'member_name': member_map.get(mid, 'Unknown'),
                'balance': float(bal),
            }
            for mid, bal in net.items()
        ]

        return Response({'member_balances': member_balances, 'suggested_settlements': debts})

    @action(detail=True, methods=['post'])
    def settle(self, request, pk=None):
        group = self.get_object()
        serializer = SplitSettlementSerializer(data={**request.data, 'group': group.id})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SplitExpenseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SplitExpenseSerializer

    def get_queryset(self):
        user = self.request.user
        group_id = self.request.query_params.get('group')
        qs = SplitExpense.objects.filter(
            Q(group__created_by=user) | Q(group__members__user=user)
        ).distinct().prefetch_related('shares__member')
        if group_id:
            qs = qs.filter(group_id=group_id)
        return qs
