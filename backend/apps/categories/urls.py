from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, BudgetViewSet

router = DefaultRouter()
# Register the more specific 'budgets' prefix BEFORE the catch-all empty prefix,
# otherwise CategoryViewSet's detail route (^(?P<pk>[^/.]+)/$) swallows /budgets/.
router.register('budgets', BudgetViewSet, basename='budget')
router.register('', CategoryViewSet, basename='category')

urlpatterns = [
    path('', include(router.urls)),
]
