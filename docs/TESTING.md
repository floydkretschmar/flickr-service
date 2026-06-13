## Testing Principles
- **Test driven**: You test before you build. Never the other way around.
- **Tests are not optional**: Never skip tests to "move faster"
- **Test parity**: Every load-bearing class or module must have a corresponding test file before a task can be considered complete.
- **Testing module integration**: Every module MUST have relevant integration test that prove ALL relevant itegration paths
- **Testing simplicity**: Never add a new test when an existing test can be parameterized to cover both scenarios. Always modify existing tests to cover new cases instead of adding new ones when possible.
- **Visual verification**: User-facing surface changes require a full Browser visual check of the affected screens and controls in addition to automated tests.

## Testing Conventions
- **No empty tests**: Every test must include meaningful assertions and follow the Arrange-Act-Assert pattern.
- **Prefer holistic tests**: Merge multiple tests that are testing partial logic into a single test that tests the entire critical path.
- **Share fixtures within modules**: Extract any shared setup or fixture logic into a single fixture file adjacent to the test files and reuse it.Fixtures HAVE to stay local in a module. Do not centralize them or cross-reference them across modules.
- **Use parameterized tests**: Merge ALL dedicated tests that can be expressed as a single parameterized test testing the same critical path.
- **Remove duplicates**: Remove any partial or full duplicate tests.
- **Maintain readability**: Never use bad formatting practices to reduce lines of code. Always maintain readability and clarity of the tests.
- **Keep tests honest**: Never weaken or simplify a test to make it pass; keep the real failing value in the test and fix the logic at the root.
- **No contract assertions in tests**: Keep unit and strategy tests focused on public behavior of the module under test.

### Other Conventions
- Test package paths must mirror main package paths exactly; integration-test grouping must still align with corresponding implementation slice/package.
- Never add dedicated tests for pure cleanup-only changes such as dead-code removal, catalog pruning, or unused-import deletion when no user-visible behavior changes; verify existing behavior instead of introducing brittle cleanup tests.

### Good Tests

**Integration-style**: Test through real interfaces, not mocks of internal parts.

```pseudocode
// GOOD: Tests observable behavior
test "user can checkout with valid cart":
  cart = create_cart()
  cart.add(product)

  result = checkout(cart, payment_method)

  assert result.status == "confirmed"
```

Characteristics:

- Tests behavior users/callers care about
- Uses public API only
- Survives internal refactors
- Describes WHAT, not HOW
- One logical assertion per test

### Bad Tests

**Implementation-detail tests**: Coupled to internal structure.

```pseudocode
// BAD: Tests implementation details
test "checkout calls payment service process":
  mock_payment_service = mock(payment_service)

  checkout(cart, payment_method)

  assert mock_payment_service.process_was_called_with(cart.total)
```

Red flags:

- Mocking internal collaborators
- Testing private methods
- Asserting on call counts/order
- Test breaks when refactoring without behavior change
- Test name describes HOW not WHAT
- Verifying through external means instead of interface

```pseudocode
// BAD: Bypasses interface to verify
test "create user saves to storage":
  create_user(name: "Alice")

  row = storage.query_user_by_name("Alice")

  assert row exists

// GOOD: Verifies through interface
test "create user makes user retrievable":
  user = create_user(name: "Alice")

  retrieved = get_user(user.id)

  assert retrieved.name == "Alice"
```

### When to Mock

Mock at **system boundaries** only:

- External APIs (payment, email, etc.)
- Databases (sometimes - prefer test DB)
- Time/randomness
- File system (sometimes)

Don't mock:

- Your own classes/modules
- Internal collaborators
- Anything you control

### Designing for Mockability

At system boundaries, design interfaces that are easy to mock:

**1. Use dependency injection**

Pass external dependencies in rather than creating them internally:

```pseudocode
// Easy to mock
function process_payment(order, payment_client):
  return payment_client.charge(order.total)

// Hard to mock
function process_payment(order):
  client = create_payment_client_from_environment()
  return client.charge(order.total)
```

**2. Prefer SDK-style interfaces over generic fetchers**

Create specific functions for each external operation instead of one generic function with conditional logic:

```pseudocode
// GOOD: Each function is independently mockable
client:
  get_user(id)
  get_orders(user_id)
  create_order(order_data)

// BAD: Mocking requires conditional logic inside the mock
generic_client:
  request(operation_name, options)
```

The SDK approach means:
- Each mock returns one specific shape
- No conditional logic in test setup
- Easier to see which endpoints a test exercises
- Type safety per endpoint
