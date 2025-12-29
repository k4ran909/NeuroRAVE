---
description: Deploy Neuro RAVE to GitHub Pages
---

# Deploy Guidelines

This workflow describes the steps to deploy the Neuro RAVE application to GitHub Pages using GitHub Actions.

## 1. Prerequisites

- [x] Configure `astro.config.mjs` with correct `site` and `base`.
- [x] Create `.github/workflows/deploy.yml`.

## 2. GitHub Repository Settings (Manual Steps)

You must enable GitHub Actions permissions on your repository for the deployment to work.

1.  Open your repository on GitHub: [https://github.com/k4ran909/NeuroRAVE](https://github.com/k4ran909/NeuroRAVE)
2.  Go to **Settings** > **Actions** > **General**.
3.  Under **Action permissions**, select **Allow all actions and reusable workflows**.
4.  Click **Save**.
5.  Go to **Settings** > **Pages**.
6.  Under **Build and deployment** > **Source**, select **GitHub Actions**.

## 3. Trigger Deployment

- Any push to the `main` branch will automatically trigger a build and deploy.
- You can check the status in the **Actions** tab of your repository.

## 4. Verify

- Once the Action finishes, your site will be live at:
  [https://k4ran909.github.io/NeuroRAVE](https://k4ran909.github.io/NeuroRAVE)
