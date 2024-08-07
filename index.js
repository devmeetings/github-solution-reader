const octokit = require('@octokit/rest')()
const Dashboard = require('./dashboard')
const { startServer } = require('./server')

const token = process.env.TOKEN
if (!token) {
  throw new Error('Github TOKEN is required')
}

octokit.authenticate({
  type: 'oauth',
  token
})

const repos = require('fs')
  .readFileSync(process.argv[2] || './repos.txt', 'utf8')
  .split('\n')
  .filter(x => x)
  .map(line => {
    const pattern = /([^ /\\]+)[/ ]([^ /\\]+)(.git)?$/
    const match = line.match(pattern)
    if (!match) {
      throw new Error(`Cannot read repo: ${line}`)
    }
    return {
      owner: match[1],
      repo: match[2]
    }
  })

if (require.main === module) {
  // delay starting work to prevent restart&crash cycle
  console.log('Delayed start...')

  setTimeout(() => {
    doWork(repos, parseInt(process.argv[2]) || 30000)
  }, 5000)

  startServer()
}

async function doWork (repos, interval) {
  let newRepos = repos
  try {
    newRepos = await buildDashboard(repos)
  } catch (e) {
    console.error('Unable to fetch data', e)
  }

  setTimeout(() => {
    doWork(newRepos, interval)
  }, interval)
}

async function buildDashboard (repos) {
  const commitsForRepos = await collectCommits(repos)
  const writer = new Dashboard()

  await writer.start()

  for (const repo of commitsForRepos) {
    const solutions = findSolutions(repo.commits)
    await writer.addRow(repo.owner, repo.repo, solutions)
  }

  await writer.end()

  return commitsForRepos
}

function findSolutions (commits) {
  commits = commits || []
  return commits.reduce((solutions, commit) => {
    const solution = /\[\s*#\s*(\d+(.\d+)?)\s*\]/g
    let match;
    while (match = solution.exec(commit.message)) {
      const res = parseFloat(match[1])
      if (!isNaN(res)) {
        solutions[res] = commit
      }
    }

    return solutions
  }, {})
}
exports.findSolutions = findSolutions;

function extractCommitData (commit) {
  return {
    sha: commit.sha,
    url: commit.url,
    message: commit.commit.message,
    name: commit.commit.author.name,
    email: commit.commit.author.email
  }
}

function collectCommits (repos) {
  return Promise.all(repos.map(async previousData => {
    const { owner, repo, commits } = previousData
    try {
      const lastCommit = await octokit.repos.getCommits({
        owner,
        repo,
        per_page: 1
      })

      // Nothing changed
      if (commits && commits[0] && lastCommit.data[0].sha === commits[0].sha) {
        return previousData
      }

      // fetch all commits
      let response = await octokit.repos.getCommits({
        owner,
        repo,
        per_page: 100
      })

      let newCommits = response.data.map(extractCommitData)

      while (octokit.hasNextPage(response)) {
        response = await octokit.getNextPage(response)
        newCommits = newCommits.concat(response.data.map(extractCommitData))
      }

      previousData.commits = newCommits

      return previousData
    } catch (e) {
      console.error(e);
      return previousData;
    }
  }))
}
