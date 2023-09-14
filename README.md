# Check other workflows

This action checks the status of other workflows.  
If other workflows are running, this action will wait until they are finished.  
In this case:

- Workflow1 is success
- Workflow2 is failure
- Workflow3 is success

status of other workflows is `FAILURE`.

## Usage

```yml
name: echo current checks status

on:
  pull_request_review:
    types:
      - submitted

jobs:
  echo_status:
    runs-on: ubuntu-latest
    steps:
      - name: check status
        uses: @tyankatsu0105/check-other-workflows@v1
        id: workflows

      - name: success
        if: steps.workflows.outputs.status != 'SUCCESS'
        run: |
          echo All workflows succeeded!!

      - name: fail
        if: steps.workflows.outputs.status != 'FAILURE'
        run: |
          echo Some existing workflows failed!!
          exit 1
```

## Inputs

| name     | description                 | required | default      |
| :------- | :-------------------------- | :------- | :----------- |
| token    | GitHub token                | false    | github.token |
| interval | interval of checking status | false    | 5000         |

## Outputs

| name   | description               | value              |
| :----- | :------------------------ | :----------------- |
| status | status of other workflows | SUCCESS or FAILURE |

## License

See [LICENSE](./LICENSE).
