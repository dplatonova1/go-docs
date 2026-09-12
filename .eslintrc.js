module.exports = {
  root: true,
  extends: ['@react-native', 'plugin:react-native-a11y/basic'],
  rules: {
    // has-accessibility-hint требует accessibilityHint везде, где задан
    // accessibilityLabel. Это строже гайдлайнов Apple и Google: там
    // подсказка нужна ТОЛЬКО когда результат действия не очевиден из
    // надписи. Механическое следование правилу навесило бы подсказку на
    // каждую кнопку и сделало озвучку скринридера шумной — то есть
    // ухудшило бы доступность, а не улучшило.
    //
    // Отключено именно это правило. Остальные проверки плагина —
    // валидность ролей и состояний, вложенные touchable, обязательные
    // a11y-пропсы у Touchable* — остаются включёнными.
    'react-native-a11y/has-accessibility-hint': 'off',
  },
};
