/* Compatibility adapter: the training owns every cue's timing; synthesis is shared. */
class FocusTrackingAudio extends FocusFeedback {
  pop(index) { return this.play('pop', {index}); }
  count() { return this.play('count'); }
  confirm() { return this.play('confirm'); }
}
