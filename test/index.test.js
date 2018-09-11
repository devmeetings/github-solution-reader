const expect = require('expect.js')
const { findSolutions } = require('../index')

it('should match multiple solutions', () => {
  expect(findSolutions([{message: "[#1.1][#1.2] Done"}])).to.eql({
    "1.1": {
        "message": "[#1.1][#1.2] Done"
      },
    "1.2": {
        "message": "[#1.1][#1.2] Done"
      }
  })
})
