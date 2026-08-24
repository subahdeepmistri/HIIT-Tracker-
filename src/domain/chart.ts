/**
 * Shape-agnostic chart datum owned by the domain layer so engine analytics can
 * produce chart-ready points without knowing a single thing about the UI.
 * The renderer (ui/charts/LineChart) imports this type — never the reverse.
 */
export interface ChartPoint {
  label: string;
  value: number;
}
