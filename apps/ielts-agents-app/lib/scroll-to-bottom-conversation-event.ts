export class ScrollToBottomConversationEvent extends CustomEvent<void> {
  static readonly type = "scroll-to-bottom-event";
  constructor() {
    super(ScrollToBottomConversationEvent.type);
  }
}
