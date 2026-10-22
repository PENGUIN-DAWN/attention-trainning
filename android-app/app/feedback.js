const appFeedback = new FocusFeedback({
  sound: () => activeModule === null && !preferences.effectsMuted,
  reduced: reducedMotion
});
