import { create } from "zustand";

const useStore = create<{
  radial: boolean;
  setRadial: (b: boolean) => void;
}>()((set) => ({
  radial: true,
  setRadial: (r) => set({ radial: r }),
}));

export default useStore;
