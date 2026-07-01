/** Sim events surfaced to the UI after a tick. Engine-agnostic plain data. */
export interface BorderExchangeEvent {
  readonly kind: "borderExchange";
  readonly tick: number;
  readonly proposerId: number;
  readonly receiverId: number;
  readonly tilesToProposer: number;
  readonly tilesToReceiver: number;
  readonly forced: boolean;
}

export type SimEvent = BorderExchangeEvent;
