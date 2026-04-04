'use client'
import { useState } from 'react'

const INSTRUCTIONS: Record<string, { title: string; gujarati: string; emoji: string; rules: string[]; tips: string[] }> = {
  mendicot: {
    title: 'Mendicot', gujarati: 'મેંડીકોટ', emoji: '🃏',
    rules: [
      '4 players, 2 teams: Seats 1&3 vs Seats 2&4',
      '13 cards each from a 52-card deck',
      'First player leads any card — that suit is "led suit"',
      'All others MUST follow the led suit if they have it',
      'Highest card of the led suit wins the trick',
      'The winner of a trick leads the next one',
      'Team with 7 or more tricks wins the round (+1 point)',
      'Team winning ALL 13 tricks gets +2 points (clean sweep!)',
      'The four 10s are "Mendis" — collecting all 4 is a bonus',
    ],
    tips: [
      'Watch what suits others are short on',
      'Save your Ace for when others have run out of a suit',
      'Try to keep track of the 10s — they matter!',
    ],
  },
  satto: {
    title: 'Satto', gujarati: 'સત્તો', emoji: '7️⃣',
    rules: [
      '3–8 players, each trying to empty their hand first',
      'The player with 7♠ must play it first',
      'Cards are placed on the table in sequences by suit',
      'Each suit starts at 7 and extends: 6, 5, 4... and 8, 9, 10...',
      'You can ONLY play a card adjacent to an existing sequence',
      'If you have no valid card, you must PASS (penalty!)',
      'Passing when you had a valid card = 1 penalty point',
      'First player to empty their hand wins the round',
    ],
    tips: [
      'Hold back cards that block others!',
      'Never pass if you have a valid card — penalties add up',
      'Try to guess what cards others are holding back',
    ],
  },
  kachu_phool: {
    title: 'Kachu Phool', gujarati: 'કાચૂ ફૂલ', emoji: '💔',
    rules: [
      '3–6 players, all trying to AVOID penalty cards',
      'Penalty cards: Every ♥ = 1 point, Q♠ = 13 points',
      'Must follow the led suit if you have it',
      'Cannot lead ♥ until hearts are "broken" (someone discards a ♥)',
      'Lowest score at the end of agreed rounds wins',
      'SHOOT THE MOON: Collect ALL 26 penalty points in one round = everyone else gets +26!',
      'Player with 2♣ leads the first trick',
    ],
    tips: [
      'The Q♠ is deadly — get rid of it early if you can',
      'If you have all ♥, consider shooting the moon!',
      'Keep track of whether Q♠ has been played',
    ],
  },
  '420': {
    title: '420', gujarati: 'ચારસો વીસ', emoji: '🎯',
    rules: [
      '4 players bid on how many tricks they will win',
      'Minimum bid is 5 tricks',
      'You can also PASS if you don\'t want to bid',
      'Highest bidder chooses the trump suit',
      'Trump cards beat all other suits',
      'Must follow led suit if you have it',
      'If bidder makes their bid: +10 points per trick bid',
      'If bidder fails their bid: -10 points per trick bid',
      'First to reach 420 points wins the game!',
    ],
    tips: [
      'Count your sure tricks before bidding',
      'Having multiple cards in trump suit is powerful',
      'Sometimes passing is smarter than overbidding',
    ],
  },
  joker: {
    title: 'Joker Game', gujarati: 'જોકર ગેમ', emoji: '🃏',
    rules: [
      '4–6 players, 2 teams (like Mendicot)',
      'Uses a 54-card deck with 2 Jokers added',
      'First player selects the trump suit',
      'Jokers are the HIGHEST cards — they beat everything!',
      'Must follow led suit if you have it (Jokers can always be played)',
      'Team with more tricks wins the round',
      'Winning a trick WITH a Joker = bonus 2 points!',
      'Track points across multiple rounds',
    ],
    tips: [
      'Save your Joker for when the opponents are winning a big trick',
      'Try to lead trump to draw out the Jokers',
      'Joker tricks are worth double — use them wisely!',
    ],
  },
  kachuful: {
    title: 'KachuFul', gujarati: 'કાચૂ ફૂલ', emoji: '🎰',
    rules: [
      '4 players, exactly 13 rounds to complete the full game',
      'Round 1 = 1 card each, Round 2 = 2 cards each... Round 13 = 13 cards each',
      'After cards are dealt, the trump suit (Hukum) is revealed',
      'BIDDING: Each player bids how many tricks they will win (0 to N)',
      'You must follow the led suit if you have it',
      'Trump cards beat all other suits',
      'SCORING: If your tricks = your bid → you get 10 + (bid × 2) points',
      'If your tricks ≠ your bid (more OR less) → you get 0 points!',
      'After all 13 rounds, the player with most points wins',
    ],
    tips: [
      'Bidding 0 and succeeding is powerful early — 10 free points!',
      'Count trump cards in your hand before bidding',
      'Watch what others bid — total bids vs available tricks tells you a lot',
      'Sometimes it\'s smart to sacrifice one trick to help your bid',
    ],
  },
  bluff: {
    title: 'Bluff', gujarati: 'બ્લફ', emoji: '🎭',
    rules: [
      '2–8 players · 2 decks mixed (108 cards including Jokers)',
      'Cards are dealt equally to all players',
      'On your turn: place 1–4 cards FACE DOWN and claim any rank (e.g. "3 sevens")',
      'You can lie — the cards don\'t have to match what you claim!',
      'Any other player can shout BLUFF! after your play',
      'If you were bluffing → YOU pick up the entire pile',
      'If you were honest → the accuser picks up the entire pile',
      'Jokers are wild — they can never be caught as a bluff',
      'First player to empty their hand wins!',
    ],
    tips: [
      'Watch how many cards others play — someone with 1 card is dangerous!',
      'Sometimes playing honestly is the best bluff',
      'If the pile is huge, be careful calling bluff — you might have to take it all!',
      'Use Jokers when the pile is large to guarantee safety',
    ],
  },
}

interface Props {
  gameType: string
  onClose: () => void
}

export default function InstructionsModal({ gameType, onClose }: Props) {
  const info = INSTRUCTIONS[gameType]
  if (!info) return null
  const [tab, setTab] = useState<'rules' | 'tips'>('rules')

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 32 }}>{info.emoji}</span>
              <div>
                <h2 className="font-title text-xl text-white" style={{ color: '#f0c040' }}>{info.title}</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{info.gujarati}</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }}>✕ Close</button>
        </div>

        <div className="flex gap-2 mb-5">
          <button onClick={() => setTab('rules')} className={tab === 'rules' ? 'btn-gold' : 'btn-ghost'} style={{ flex: 1, padding: '8px' }}>📋 Rules</button>
          <button onClick={() => setTab('tips')} className={tab === 'tips' ? 'btn-gold' : 'btn-ghost'} style={{ flex: 1, padding: '8px' }}>💡 Tips</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(tab === 'rules' ? info.rules : info.tips).map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(201,162,39,0.2)', border: '1px solid rgba(201,162,39,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#f0c040', flexShrink: 0, marginTop: 2 }}>
                {tab === 'rules' ? i + 1 : '•'}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.6 }}>{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
