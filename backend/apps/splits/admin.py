from django.contrib import admin
from .models import SplitGroup, GuestUser, SplitGroupMember, SplitExpense, SplitExpenseShare, SplitSettlement

admin.site.register(SplitGroup)
admin.site.register(GuestUser)
admin.site.register(SplitGroupMember)
admin.site.register(SplitExpense)
admin.site.register(SplitExpenseShare)
admin.site.register(SplitSettlement)
