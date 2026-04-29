[![npm](https://img.shields.io/npm/v/@sapphire-cms/firebase.svg)](http://npm.im/@sapphire-cms/firebase)

# Firebase Module

This module provides the ability to run Sapphire CMS on Firebase platform.

## Install

```yaml
sapphire-cms package install firebase
```

or

```yaml
scms pkg i firebase
```

## Provided Layers

- `persistence`
- `platform`

## Examples

```yaml
# ./sapphire-cms.config.yaml

layers:
  persistence: '@firebase'
  platform: '@firebase'
```

## Parameters

| Parameter    | Type   | Mandatory | Description                                                 |
| ------------ | ------ | --------- | ----------------------------------------------------------- |
| project-id   | string | no        | The ID of the Google Cloud project associated with the App. |
| client-email | string | no        | Service Account email.                                      |
| private-key  | string | no        | Service Account private key.                                |
