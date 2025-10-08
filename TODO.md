# TODO: Make compatible double and triple bonds with thiol naming

## Steps:
1. Modify `javascript/nomenclatura.js`:
   - Update `findLongestChain` to accept an optional `start` parameter to start DFS from a specific node.
   - Update `getBranchedAlkaneName` to accept an optional `mainChain` parameter and use it if provided.
   - In `getBranchedAlkaneName`, add logic to insert positions for double/triple bonds in the name (e.g., 'prop-2-eno').

2. Modify `javascript/nomenclatura2.js`:
   - In `getCompleteName`, for principal functional groups like thiol, find the longest chain starting from the attached carbon and pass it to `getBranchedAlkaneName`.
   - In `getFunctionalGroupName`, update the thiol naming to replace the suffix ('ano', 'eno', 'ino') with '-1-tiol' since the chain is renumbered with thiol at position 1.

3. Test the changes to ensure correct naming for compounds with thiol and double/triple bonds.
