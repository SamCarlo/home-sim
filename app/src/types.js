// Shared JSDoc shapes. No runtime code. Later tasks expand these (see docs/spec).

/**
 * The whole save document (02 §2). Phase decides which screen shows.
 * @typedef {Object} State
 * @property {number} version
 * @property {'intake'|'plan'|'paperwork'|'design'|'life'} phase
 * @property {Object} meta      createdAt, updatedAt, saveCount, seed (= hashString(uid))
 * @property {Object} account   username, classCode (display copy)
 * @property {Object} [player]  characterName, jobTitle, netMonthlyIncomeCents, weeklyJobHours, startingSavingsCents
 * @property {Object} [finances]
 * @property {Object} [plan]
 * @property {Object} [home]
 * @property {Object} [life]
 * @property {Object} [settings]
 */

/**
 * One of the 20 places (03 §2).
 * @typedef {Object} Location
 * @property {string} id        kebab-case, e.g. 'pahoa'
 * @property {string} name
 * @property {string} region
 */

/**
 * One line of a cost breakdown (04 §3).
 * @typedef {Object} CostLine
 * @property {string} key
 * @property {string} label
 * @property {number} cents
 * @property {string} [note]
 */

/**
 * A location × home type cost (04 §3).
 * @typedef {Object} CellCost
 * @property {boolean} available
 * @property {string} [naReason]
 * @property {number} upfrontCents
 * @property {number} monthlyCents
 * @property {CostLine[]} upfront
 * @property {CostLine[]} monthly
 * @property {string[]} assumptions
 */

/**
 * What every 3D home generator returns (08 §5).
 * @typedef {Object} HomeModel
 * @property {Object} group     THREE.Group
 * @property {Object} door
 * @property {Object[]} path
 * @property {Object} exit
 */

/**
 * planMonth() output: everything for a month, precomputed and seeded (09 §5).
 * @typedef {Object} MonthPlan
 * @property {number} monthIndex
 * @property {Object[]} events
 * @property {Object<string, number[]>} marketPaths
 * @property {number[]} careSchedule
 */

export {};
