from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SplitGroupViewSet, SplitExpenseViewSet

router = DefaultRouter()
router.register('groups', SplitGroupViewSet, basename='split-group')
router.register('expenses', SplitExpenseViewSet, basename='split-expense')

urlpatterns = [
    path('', include(router.urls)),
]
