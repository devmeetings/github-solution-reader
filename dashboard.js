const path = require('path')
const fs = require('fs')
const handlebars = require('handlebars')

const template = handlebars.compile(
  fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8')
)

module.exports = class Dashboard {
  async start () {
    this.data = [];
  }

  async addRow (owner, repo, solutions) {
    const score = Object.keys(solutions).length;
    this.data.push({owner, repo, solutions, score })
  }

  async end () {
    const columns = Object.keys(this.data.reduce((cols, row) => {
      Object.keys(row.solutions).forEach(key => cols[key] = true)
      return cols
    }, {})).map(x => parseFloat(x))
    // sort columns
    columns.sort()
    // sort solutions by score
    this.data.sort((a, b) => a.score - b.score)

    const content = template({
      columns,
      repos: this.data
    })

    console.log(content)
    fs.writeFileSync('dashboard.html', content, 'utf8')
  }
}
