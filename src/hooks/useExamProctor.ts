import { useAntiCheatCBT, UseAntiCheatCBTProps, AntiCheatWarningData } from './useAntiCheatCBT';

export { useAntiCheatCBT };
export type { UseAntiCheatCBTProps, AntiCheatWarningData };

export function useExamProctor(props: UseAntiCheatCBTProps) {
  const antiCheat = useAntiCheatCBT(props);

  return {
    ...antiCheat,
    isLocked: antiCheat.lockStage > 0,
    showYellowModal: antiCheat.showWarningModal,
    yellowPenaltyCountdown: 0,
    yellowModalReason: antiCheat.warningData?.reason || '',
    dismissYellowModal: antiCheat.dismissWarningModal,
    isFullscreen: antiCheat.isFullscreen,
    isSplitScreen: antiCheat.warningData?.reason?.includes('Split-Screen') || false,
    warningMessage: null,
    isSusulanRedirect: Boolean(antiCheat.isSusulanRedirect),
    susulanReason: antiCheat.susulanReason || '',
  };
}
