export function successResponse(response: any) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(response)
  }
}

export function clientErrorResponse() {
  return {
    statusCode: 400,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message: 'Bad Request' })
  }
}

export function notFoundResponse() {
  return {
    statusCode: 404,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message: 'Not Found' })
  }
}

export function serverErrorResponse() {
  return {
    statusCode: 500,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message: 'Internal Server Error' })
  }
}

export function notAllowedResponse() {
  return {
    statusCode: 405,
    body: null
  }
}