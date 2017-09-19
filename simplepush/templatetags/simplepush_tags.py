from django import template
from django.core.urlresolvers import reverse

register = template.Library()


@register.filter
@register.inclusion_tag('simplepush/simplepush_meta.html', takes_context=True)
def simplepush_meta(context):
    request = context['request']
    return {'request': request}


@register.filter
@register.inclusion_tag('simplepush/simplepush_js.html', takes_context=True)
def simplepush_js(context):
    request = context['request']
    return {'request': request}


@register.filter
@register.inclusion_tag('simplepush/simplepush_message.html', takes_context=True)
def simplepush_message(context):
    request = context['request']
    return {'request': request}


@register.filter
@register.inclusion_tag('simplepush/simplepush_button.html', takes_context=True)
def simplepush_button(context):
    url = reverse('save_simplepush_info')
    request = context['request']
    return {'url': url, 'request': request}