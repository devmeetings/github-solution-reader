const octokit = require('@octokit/rest')()
const Dashboard = require('./dashboard')


doWork([
  {
    owner: 'tomusdrw',
    repo: 'rust-web3'
  }
], 5000)

async function doWork (repos, interval) {
  let newRepos = repos;
  try {
    newRepos = await buildDashboard(repos)
  } catch (e) {
    console.error("Unable to fetch data", e)
  }

  setTimeout(() => {
    doWork(newRepos)
  }, interval)
}

async function buildDashboard (repos) {
  const commitsForRepos = await collectCommits(repos)
  const writer = new Dashboard();

  await writer.start()

  for (repo of commitsForRepos) {
    const solutions = findSolutions(repo.commits)
    await writer.addRow(repo.owner, repo.repo, solutions)
  }

  await writer.end()

  return commitsForRepos
}

function findSolutions (commits) {
  return []
}

function collectCommits (repos) {
  return Promise.all(repos.map(async previousData => {
    const { owner, repo, commits } = previousData
    const lastCommit = await octokit.repos.getCommits({
      owner,
      repo,
      per_page: 1,
    })

    // Nothing changed
    if (commits && commits[0] && lastCommit.data[0].sha === commits[0].sha) {
      return previousData
    }

    // fetch all commits
    let response = await octokit.repos.getCommits({
      owner,
      repo,
      per_page: 100,
    })

    let newCommits = response.data.map(extractCommitData)

    while (octokit.hasNextPage(response)) {
      response = await octokit.getNextPage(response)
      newCommits = newCommits.concat(response.data.map(extractCommitData))
    }

    previousData.commits = newCommits

    return previousData
  }))
}

function extractCommitData (commit) {
  return {
    sha: commit.sha,
    url: commit.url,
    message: commit.message,
    name: commit.author.name,
    email: commit.author.email
  }
}
