from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TransactionViewSet, TagViewSet, RecurringRuleViewSet

router = DefaultRouter()
router.register('', TransactionViewSet, basename='transaction')
router.register('tags', TagViewSet, basename='tag')
router.register('recurring', RecurringRuleViewSet, basename='recurring')

urlpatterns = [
    path('', include(router.urls)),
]
