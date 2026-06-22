/* grpoVidBench — site-wide configuration.
 *
 * Automatic response collection:
 *   Paste your deployed Google Apps Script Web App URL between the quotes below.
 *   When set, every study POSTs its JSON + CSV to that endpoint on submit (and the
 *   reviewer still gets a local download as a backup). Leave it "" to disable
 *   collection — studies then only download locally.
 *
 *   See collect/README.md for the 5-minute setup. A per-study "collect_endpoint"
 *   in studies/<id>.json overrides this default for that study.
 */
window.GRPOVIDBENCH_COLLECT_ENDPOINT = "";
