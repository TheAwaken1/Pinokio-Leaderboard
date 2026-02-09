module.exports = {
  run: [
    {
      method: "input",
      params: {
        title: "GitHub Token (Optional)",
        description: "A GitHub personal access token enables expanded app discovery via code search. Without it, only repos tagged with the 'pinokio' topic are found. Create a token at https://github.com/settings/tokens (no scopes needed — public repo access only).",
        form: [{
          type: "password",
          key: "github_token",
          title: "GitHub Token",
          placeholder: "ghp_... (leave blank to disable code search)",
          default: ""
        }]
      }
    },
    {
      method: "fs.write",
      params: {
        path: "config.json",
        json2: {
          github_token: "{{input.github_token}}"
        }
      }
    },
    {
      method: "notify",
      params: {
        html: "Settings saved. Restart the app for changes to take effect."
      }
    }
  ]
}
