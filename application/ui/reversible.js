/* ===========================================================================
 *  reversible.js  -  ONE way to change something and be able to put it back,
 *                    and ONE order in which a change is committed and shown.
 *
 *  The app already had the door: toast(message, undoFn) renders an Undo button
 *  beside the message for ten seconds. Of seventy-one toast calls, four used
 *  it. Not because undo was unwanted, but because every call site had to
 *  capture the prior value itself, write the reversal itself, and remember to
 *  re-render on both paths - three chances to get it wrong, for something that
 *  felt optional. So a person could tick "counts as saving", reassign a
 *  category, or clear a goal and have no way back except remembering what they
 *  had and redoing it by hand.
 *
 *  This makes the reversal automatic. The caller says what changed and what it
 *  is changing to; the prior value is captured, the write and the re-render
 *  happen on both the do and the undo path, and the person is told what
 *  happened with the way back sitting next to it.
 *
 *  Reversing a choice should be at least as easy as making it. Here it is
 *  exactly as easy: one call, one tap.
 *
 *  Built once, reused everywhere, the same way the shared calculation and
 *  disclosure mechanisms were.
 * ======================================================================== */

import { requireCtx } from '../core/shared-helpers.js';

/* THE order: commit, then render, then say so. Never any other order.
 *
 * Five separate bugs in this project have been the same bug. Each time, a
 * message on screen described a save that had not finished happening:
 *
 *   1. the Plan editor showing "Not saved yet" beside a "Saved" button;
 *   2. the goal card's description fixed while its buttons kept a stale
 *      wording template;
 *   3. the Plan hero and the Plan editor answering "is this saved?" from two
 *      different facts, one of which did not mean what its label implied;
 *   4. a success toast firing before the saved state had rendered;
 *   5. the Plan wizard announcing success before its committed values were on
 *      screen.
 *
 * Five instances, five locations, one shape: the write, the repaint and the
 * announcement were sequenced by hand at each call site, and a hand-sequenced
 * ordering is one a future edit can reorder without anything complaining.
 *
 * So the ordering stops being a convention and becomes a function. `commit` is
 * awaited to completion - a promise that has not settled is not a saved state.
 * Only then does `render` run, so what is on screen is read back from what was
 * actually committed. Only then does `notify` run, so no message can describe a
 * state that does not yet exist. A caller cannot get the order wrong, because
 * the caller no longer supplies an order.
 *
 * `notify` is the important half of the contract: a toast fired outside it is
 * exactly the bug this exists to prevent, which is why the guard in
 * tests/wiring_contracts_proof.mjs looks for save-toasts that are not inside a
 * commitAndRender call.
 */
export async function commitAndRender({ commit, render, notify }) {
  if (typeof commit !== 'function' || typeof render !== 'function') {
    throw new TypeError('commitAndRender requires commit and render functions');
  }
  const result = await commit();
  render();
  if (typeof notify === 'function') notify(result);
  return result;
}

export function createReversible(ctx) {
  requireCtx(ctx, ['Store', 'state', 'render', 'toast'], 'createReversible');
  const { Store, state, render, toast } = ctx;

  async function change({ metaKey, stateKey, next, describe, after, track }) {
    const key = stateKey || `_${metaKey}`;
    const prior = state[key];
    const write = (value, notify) =>
      commitAndRender({
        commit: async () => {
          await Store.setMeta(metaKey, value === undefined ? null : value);
          state[key] = value;
          if (typeof after === 'function') after(value);
        },
        render,
        notify,
      });
    // The announcement is the contract's `notify`, not a statement made
    // alongside it - so the sentence describing the change cannot appear before
    // the change is committed and on screen. The undo path says "Put back."
    // through the same contract, for the same reason.
    await write(next, () =>
      toast(
        typeof describe === 'function' ? describe(next, prior) : String(describe || 'Changed.'),
        async () => {
          await write(prior, () => toast('Put back.'));
        }
      )
    );
    if (track) track();
  }

  async function changeMany({ writes, describe, after, track }) {
    const entries = (writes || []).map((write) => ({
      ...write,
      stateKey: write.stateKey || `_${write.metaKey}`,
    }));
    const priors = entries.map((entry) => state[entry.stateKey]);
    const apply = (values, notify) =>
      commitAndRender({
        commit: async () => {
          await Store.setMetaMany(
            entries.map((entry, index) => ({
              key: entry.metaKey,
              value: values[index] === undefined ? null : values[index],
            }))
          );
          entries.forEach((entry, index) => {
            state[entry.stateKey] = values[index];
          });
          if (typeof after === 'function') after(values);
        },
        render,
        notify,
      });
    await apply(entries.map((entry) => entry.next), () =>
      toast(typeof describe === 'function' ? describe() : String(describe || 'Changed.'), async () => {
        await apply(priors, () => toast('Put back.'));
      })
    );
    if (track) track();
  }

  async function removeRecords({ store, records, reload, describe, track }) {
    const gone = (records || []).filter(Boolean);
    if (!gone.length) return;
    await commitAndRender({
      commit: async () => {
        for (const record of gone) await store.delete(record.id);
        if (typeof reload === 'function') await reload();
      },
      render,
      notify: () =>
        toast(
          typeof describe === 'function' ? describe(gone) : String(describe || 'Removed.'),
          async () => {
            await commitAndRender({
              commit: async () => {
                for (const record of gone) await store.put(record);
                if (typeof reload === 'function') await reload();
              },
              render,
              notify: () => toast('Put back.'),
            });
          }
        ),
    });
    if (track) track();
  }

  async function addRecord({ store, record, reload, describe, track }) {
    if (!record || !record.id) return;
    await commitAndRender({
      commit: async () => {
        await store.put(record);
        if (typeof reload === 'function') await reload();
      },
      render,
      notify: () =>
        toast(
          typeof describe === 'function' ? describe(record) : String(describe || 'Added.'),
          async () => {
            await commitAndRender({
              commit: async () => {
                await store.delete(record.id);
                if (typeof reload === 'function') await reload();
              },
              render,
              notify: () => toast('Put back.'),
            });
          }
        ),
    });
    if (track) track();
  }

  return { change, changeMany, removeRecords, addRecord };
}
