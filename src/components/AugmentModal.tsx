import { AnimatePresence, motion } from "framer-motion";
import { Gem } from "lucide-react";
import { useGameStore } from "../store/gameStore";

export function AugmentModal() {
  const game = useGameStore((state) => state.game);
  const chooseAugment = useGameStore((state) => state.chooseAugment);
  const visible = game.phase === "augment_select" && game.augmentChoices.length > 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="augment-modal" initial={{ y: 24, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 18, scale: 0.97 }}>
            <div className="mb-5 flex items-center gap-3">
              <div className="icon-orb">
                <Gem size={22} />
              </div>
              <div>
                <p className="eyebrow">海克斯抉择</p>
                <h2>选择一个构筑方向</h2>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {game.augmentChoices.map((augment) => (
                <button key={augment.id} type="button" className="augment-option" onClick={() => chooseAugment(augment)}>
                  <span>{augment.rarity}</span>
                  <strong>{augment.name}</strong>
                  <p>{augment.description}</p>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
