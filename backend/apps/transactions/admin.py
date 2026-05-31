from django.contrib import admin
from .models import Transaction, Tag, RecurringRule

admin.site.register(Transaction)
admin.site.register(Tag)
admin.site.register(RecurringRule)
