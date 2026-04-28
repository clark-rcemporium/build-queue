# Dual-Agent Build Pipeline (build-queue)

Welcome to the **Dual-Agent Build Pipeline** repository for RC Emporium Technologies Inc.

This repository serves as the central queue and automated generation engine for our Dual-Agent Build Pipeline. It splits the build process between two AI agents to optimize costs and efficiency:

1. **Code Generation (OpenAI / ChatGPT):** Writes 100% of the code based on a build request.
2. **Assembly & Deployment (MAVOS / Manus):** Assembles, installs, builds, and deploys the generated code.

## How It Works

1. **Submit a Request:** MAVOS (or a user) pushes a JSON build request file to the `requests/` folder.
2. **Auto-Generation:** A GitHub Actions workflow automatically triggers, reads the JSON file, and calls the OpenAI API to generate the complete project code.
3. **Code Delivery:** The generated code is committed back to this repository under a new timestamped folder in `builds/`, along with a `STATUS.md` file marked as `READY_FOR_ASSEMBLY`.
4. **Assembly:** MAVOS pulls the generated code from the `builds/` folder, assembles it, and deploys it to production.

## Repository Structure

- `requests/`: Drop your JSON build request files here to trigger the pipeline.
- `builds/`: Generated code will be automatically saved here in timestamped folders.
- `.github/workflows/`: Contains the GitHub Actions workflow (`generate-code.yml`) that powers the automation.

## Request Format

See `requests/TEMPLATE.json` for the required format of a build request.

## IP Reference

**IP-206** — Dual-Agent Build Pipeline with Trigger-Phrase Activation
A system where a founder uses a single trigger phrase to activate a split-execution workflow between a free reasoning AI (code generation) and a paid execution AI (assembly/deployment), reducing AI infrastructure costs by 90%+ while maintaining full production capability.
