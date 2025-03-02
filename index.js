const core = require("@actions/core");
const github = require("@actions/github");

const name = core.getInput("name");
const token = core.getInput("token");
const octokit = github.getOctokit(token);

const context = github.context;
const repoName = context.payload.repository.name;
const ownerName = context.payload.repository.owner.login;

let repository = core.getInput("repository");
if (repository === "false") repository = repoName;

let owner = core.getInput("owner");
if (owner === "false") owner = ownerName;

const push_to_org = core.getInput("org") !== "false";

function get_() {

  if (push_to_org) return "/orgs/" + owner;
  if (repository.includes("/")) return "/repos/" + repository;

  return "/repos/" + owner + "/" + repository;

}

function increment(string) {

  // Extract string's number
  var number = string.match(/\d+/) === null ? 0 : string.match(/\d+/)[0];

  // Store number's length
  var numberLength = number.length;

  // Increment number by 1
  number = (parseInt(number, 10) + 1).toString();

  // If there were leading 0s, add them again
  while (number.length < numberLength) {
    number = "0" + number;
  }

  return string.replace(/[0-9]/g, "").concat(number);
}

const createVariable = (data) => {

  let url = "POST ";
  url += get_();
  url += "/actions/variables";

  return octokit.request(url, {
    owner: owner,
    repo: repository,
    name: name,
    value: data,
  });
};

const setVariable = (data) => {

  let url = "PATCH ";
  url += get_();
  url += "/actions/variables/" + name;

  return octokit.request(url, {
    owner: owner,
    repo: repository,
    name: name,
    value: data,
  });
};

const getVariable = (varname) => {

  let url = "GET ";
  url += get_();
  url += "/actions/variables/" + varname;

  return octokit.request(url, {
    owner: owner,
    repo: repository,
    name: varname,
  });
};

const bootstrap = async () => {

  let exists = false;
  let old_value = "";

  try {

    const response = await getVariable(name);

    exists = response.status === 200;
    if (exists) old_value = response.data.value;

  } catch (e) {
    // Variable does not exist
  }

  try {

    if (exists) {

      let new_value = increment(old_value);
      const response = await setVariable(new_value);

      if (response.status === 204) {
        return ("Succesfully incremented " + name + " from " + old_value + " to " + new_value + ".");
      }

      throw new Error("ERROR: Wrong status was returned: " + response.status);

    } else {

      const response = await createVariable("1");

      if (response.status === 201) {
        return "Succesfully created variable " + name + " with value 1.";
      }

      throw new Error("ERROR: Wrong status was returned: " + response.status);
    }

  } catch (e) {
    core.setFailed(get_() + ": " + e.message);
    console.error(e);
  }
};

bootstrap()
  .then(
    (result) => {
      // eslint-disable-next-line no-console
      if (result != null) {
        console.log(result);
      }
    },
    (err) => {
      // eslint-disable-next-line no-console
      core.setFailed(err.message);
      console.error(err);
    },
  )
  .then(() => {
    process.exit();
  });
