module.exports = class Dashboard {

  async write (msg) {
    console.log(msg)
  }

  async start () {
    await this.write('<table>')
  }

  async addRow (owner, repo, solutions) {
    await this.write(`
    <tr>
      <td>${owner}</td><td>${repo}</td><td>${solutions}</td>
    </tr>
`)
  }

  async end () {
    await this.write('</table>')
  }
}
