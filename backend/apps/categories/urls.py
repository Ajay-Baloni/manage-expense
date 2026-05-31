from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, BudgetViewSet

router = DefaultRouter()
router.register('', CategoryViewSet, basename='category')
router.register('budgets', BudgetViewSet, basename='budget')

urlpatterns = [
    path('', include(router.urls)),
]
