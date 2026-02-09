module.exports = {
  run: [
    {
      method: "shell.run",
      params: {
        message: "npm install",
        path: "app"
      }
    },
    {
      method: "notify",
      params: {
        html: "Click the 'start' tab to get started!"
      }
    }
  ]
}