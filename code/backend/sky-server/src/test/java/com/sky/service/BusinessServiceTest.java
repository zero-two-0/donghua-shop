package com.sky.service;

import com.sky.context.BaseContext;
import com.sky.dto.*;
import com.sky.entity.*;
import com.sky.exception.BaseException;
import com.sky.mapper.*;
import com.sky.service.impl.*;
import com.sky.websocket.WebSocketServer;
import org.junit.jupiter.api.*;
import org.mockito.*;
import java.math.BigDecimal;
import java.util.Collections;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BusinessServiceTest {
    @Mock ShoppingCartMapper carts;
    @Mock DishMapper dishes;
    @Mock SetmealMapper setmeals;
    @Mock AddressBookMapper addresses;
    @Mock OrderMapper orders;
    @Mock OrderDetailMapper details;
    @Mock WebSocketServer socket;
    @InjectMocks ShoppingCartServiceImpl cartService;
    @InjectMocks AddressBookServiceImpl addressService;
    @InjectMocks OrderServiceImpl orderService;

    @BeforeEach void setup() {
        MockitoAnnotations.initMocks(this);
        BaseContext.setCurrentId(10L);
    }
    @AfterEach void cleanup() throws Exception { BaseContext.removeCurrentId(); }
    private ShoppingCartDTO item() { ShoppingCartDTO dto = new ShoppingCartDTO(); dto.setDishId(1L); return dto; }
    private Dish availableDish() { return Dish.builder().id(1L).name("面").status(1).price(new BigDecimal("12.50")).build(); }
    private Orders order(int status, int pay) { return Orders.builder().id(3L).number("course-3").userId(10L).status(status).payStatus(pay).amount(new BigDecimal("25.00")).build(); }

    @Test void repeatedAddIncrementsExistingNumberWithoutNullPointer() {
        when(dishes.getById(1L)).thenReturn(availableDish());
        when(carts.list(any())).thenReturn(Collections.singletonList(ShoppingCart.builder().id(7L).userId(10L).number(2).build()));
        when(carts.increment(7L, 10L)).thenReturn(1);
        cartService.addShoppingCart(item());
        verify(carts).increment(7L, 10L);
        verify(carts, never()).insert(any());
    }
    @Test void addRejectsBothProductIdentifiers() {
        ShoppingCartDTO dto = item(); dto.setSetmealId(2L);
        assertThrows(BaseException.class, () -> cartService.addShoppingCart(dto));
        verifyNoInteractions(carts);
    }
    @Test void addRejectsUnavailableDish() {
        Dish dish = availableDish(); dish.setStatus(0); when(dishes.getById(1L)).thenReturn(dish);
        assertThrows(BaseException.class, () -> cartService.addShoppingCart(item()));
        verifyNoInteractions(carts);
    }
    @Test void quantityMustBeWithinOneToNinetyNine() {
        assertThrows(BaseException.class, () -> cartService.changeQuantity(7L, 0));
        assertThrows(BaseException.class, () -> cartService.changeQuantity(7L, 100));
        verifyNoInteractions(carts);
    }
    @Test void cannotDeleteAnotherUsersCart() {
        when(carts.deleteOwned(7L, 10L)).thenReturn(0);
        assertThrows(BaseException.class, () -> cartService.deleteItem(7L));
    }
    @Test void addressReadRejectsOtherOwner() {
        when(addresses.getById(7L)).thenReturn(AddressBook.builder().id(7L).userId(99L).build());
        assertThrows(BaseException.class, () -> addressService.getById(7L));
    }
    @Test void defaultOwnershipCheckedBeforeClearingExistingDefault() {
        when(addresses.getById(7L)).thenReturn(AddressBook.builder().id(7L).userId(99L).build());
        assertThrows(BaseException.class, () -> addressService.setDefault(AddressBook.builder().id(7L).build()));
        verify(addresses, never()).updateIsDefaultByUserId(any());
    }
    @Test void addressUpdateDiscardsInjectedOwnerAndDefault() {
        when(addresses.getById(7L)).thenReturn(AddressBook.builder().id(7L).userId(10L).isDefault(0).build());
        AddressBook input = AddressBook.builder().id(7L).userId(99L).isDefault(1).detail("宿舍").build();
        addressService.update(input);
        ArgumentCaptor<AddressBook> capture = ArgumentCaptor.forClass(AddressBook.class);
        verify(addresses).update(capture.capture());
        assertEquals(10L, capture.getValue().getUserId());
        assertNull(capture.getValue().getIsDefault());
    }
    @Test void submitRecalculatesAmountUsingCurrentCatalogAndSnapshots() {
        when(addresses.getById(7L)).thenReturn(AddressBook.builder().id(7L).userId(10L).detail("校园").build());
        when(carts.list(any())).thenReturn(Collections.singletonList(ShoppingCart.builder().id(8L).dishId(1L).userId(10L).number(2).amount(BigDecimal.ONE).build()));
        when(dishes.getById(1L)).thenReturn(availableDish());
        doAnswer(call -> { ((Orders) call.getArgument(0)).setId(3L); return null; }).when(orders).insert(any());
        OrdersSubmitDTO input = new OrdersSubmitDTO(); input.setAddressBookId(7L); input.setAmount(BigDecimal.ZERO); input.setPackAmount(999);
        assertEquals(new BigDecimal("25.00"), orderService.submitOrder(input).getOrderAmount());
        ArgumentCaptor<Orders> capture = ArgumentCaptor.forClass(Orders.class);
        verify(orders).insert(capture.capture()); assertEquals(0, capture.getValue().getPackAmount());
        verify(details).insertBatch(argThat(list -> list.size() == 1 && list.get(0).getAmount().equals(new BigDecimal("12.50"))));
        verify(carts).deleteByUserId(10L);
    }
    @Test void submitCannotUseOthersAddress() {
        when(addresses.getById(7L)).thenReturn(AddressBook.builder().id(7L).userId(99L).build());
        OrdersSubmitDTO input = new OrdersSubmitDTO(); input.setAddressBookId(7L);
        assertThrows(BaseException.class, () -> orderService.submitOrder(input)); verifyNoInteractions(orders);
    }
    @Test void paymentIsLocalAndTransitionsOnlyPendingOrder() throws Exception {
        when(orders.getByNumber("course-3")).thenReturn(order(1, 0));
        when(orders.transition(any(), eq(1), eq(0))).thenReturn(1);
        OrdersPaymentDTO input = new OrdersPaymentDTO(); input.setOrderNumber("course-3");
        assertEquals("SIMULATED", orderService.payment(input).getSignType());
        verify(orders).transition(argThat(value -> value.getStatus() == 2 && value.getPayStatus() == 1), eq(1), eq(0));
    }
    @Test void repeatedPaymentIsIdempotent() throws Exception {
        when(orders.getByNumber("course-3")).thenReturn(order(2, 1));
        OrdersPaymentDTO input = new OrdersPaymentDTO(); input.setOrderNumber("course-3");
        assertEquals("SIMULATED", orderService.payment(input).getSignType());
        verify(orders, never()).transition(any(), anyInt(), anyInt());
    }
    @Test void paymentRejectsOtherOwner() {
        Orders stored = order(1, 0); stored.setUserId(99L); when(orders.getByNumber("course-3")).thenReturn(stored);
        OrdersPaymentDTO input = new OrdersPaymentDTO(); input.setOrderNumber("course-3");
        assertThrows(BaseException.class, () -> orderService.payment(input));
    }
    @Test void staleTransitionCannotOverwriteNewerState() {
        when(orders.getById(3L)).thenReturn(order(2, 1));
        OrdersConfirmDTO input = new OrdersConfirmDTO(); input.setId(3L);
        assertThrows(BaseException.class, () -> orderService.confirm(input));
    }
    @Test void completionRequiresDelivery() {
        when(orders.getById(3L)).thenReturn(order(3, 1));
        assertThrows(BaseException.class, () -> orderService.complete(3L));
        verify(orders, never()).transition(any(), anyInt(), anyInt());
    }
    @Test void paidCancellationRecordsSimulatedRefund() throws Exception {
        when(orders.getById(3L)).thenReturn(order(2, 1)); when(orders.transition(any(), eq(2), eq(1))).thenReturn(1);
        orderService.cancelOrder(3L);
        verify(orders).transition(argThat(value -> value.getStatus() == 6 && value.getPayStatus() == 2), eq(2), eq(1));
    }
    @Test void orderDetailsEnforceOwnership() {
        Orders stored = order(2, 1); stored.setUserId(99L); when(orders.getById(3L)).thenReturn(stored);
        assertThrows(BaseException.class, () -> orderService.detailsForCurrentUser(3L));
        verifyNoInteractions(details);
    }

    @Test void addRejectsMissingProductIdentifier() {
        assertThrows(BaseException.class, () -> cartService.addShoppingCart(new ShoppingCartDTO()));
        verifyNoInteractions(carts);
    }
    @Test void addRejectsStoppedSetmeal() {
        ShoppingCartDTO dto = new ShoppingCartDTO(); dto.setSetmealId(2L);
        when(setmeals.getById(2L)).thenReturn(Setmeal.builder().id(2L).status(0).price(BigDecimal.TEN).build());
        assertThrows(BaseException.class, () -> cartService.addShoppingCart(dto));
        verifyNoInteractions(carts);
    }
    @Test void addingAtQuantityLimitDoesNotInsertAnotherRow() {
        when(dishes.getById(1L)).thenReturn(availableDish());
        when(carts.list(any())).thenReturn(Collections.singletonList(ShoppingCart.builder().id(7L).userId(10L).number(99).build()));
        assertThrows(BaseException.class, () -> cartService.addShoppingCart(item()));
        verify(carts, never()).insert(any());
    }
    @Test void quantityUpdateAlwaysIncludesCurrentOwner() {
        when(carts.setOwnedQuantity(7L, 10L, 5)).thenReturn(1);
        cartService.changeQuantity(7L, 5); verify(carts).setOwnedQuantity(7L, 10L, 5);
    }
    @Test void saveAddressIgnoresClientPrimaryKeyAndOwnerAndDefault() {
        AddressBook input = AddressBook.builder().id(999L).userId(99L).isDefault(1).consignee("同学").phone("13800000000").detail("宿舍").build();
        addressService.save(input);
        verify(addresses).insert(argThat(value -> value.getId() == null && value.getUserId().equals(10L) && value.getIsDefault() == 0));
    }
    @Test void addressDeleteChecksOwnerBeforeDeleting() {
        when(addresses.getById(7L)).thenReturn(AddressBook.builder().id(7L).userId(99L).build());
        assertThrows(BaseException.class, () -> addressService.deleteById(7L));
        verify(addresses, never()).deleteById(any());
    }
    @Test void submitRejectsSetmealStoppedAfterCartWasCreated() {
        when(addresses.getById(7L)).thenReturn(AddressBook.builder().id(7L).userId(10L).build());
        when(carts.list(any())).thenReturn(Collections.singletonList(ShoppingCart.builder().setmealId(2L).number(1).build()));
        when(setmeals.getById(2L)).thenReturn(Setmeal.builder().status(0).build());
        OrdersSubmitDTO input = new OrdersSubmitDTO(); input.setAddressBookId(7L);
        assertThrows(BaseException.class, () -> orderService.submitOrder(input));
        verify(orders, never()).insert(any()); verify(carts, never()).deleteByUserId(any());
    }
    @Test void cancelledOrderCannotBePaid() {
        when(orders.getByNumber("course-3")).thenReturn(order(6, 0));
        OrdersPaymentDTO input = new OrdersPaymentDTO(); input.setOrderNumber("course-3");
        assertThrows(BaseException.class, () -> orderService.payment(input));
        verify(orders, never()).transition(any(), anyInt(), anyInt());
    }
    @Test void unpaidCancellationDoesNotInventRefund() {
        when(orders.getById(3L)).thenReturn(order(1, 0)); when(orders.transition(any(), eq(1), eq(0))).thenReturn(1);
        orderService.cancelOrder(3L);
        verify(orders).transition(argThat(value -> value.getStatus() == 6 && value.getPayStatus() == 0), eq(1), eq(0));
    }
    @Test void cannotRepeatAnotherUsersOrder() {
        Orders stored = order(5, 1); stored.setUserId(99L); when(orders.getById(3L)).thenReturn(stored);
        assertThrows(BaseException.class, () -> orderService.repetition(3L)); verifyNoInteractions(details);
    }
    @Test void validCompleteTransitionRecordsDeliveryTime() {
        when(orders.getById(3L)).thenReturn(order(4, 1)); when(orders.transition(any(), eq(4), eq(1))).thenReturn(1);
        orderService.complete(3L);
        verify(orders).transition(argThat(value -> value.getStatus() == 5 && value.getDeliveryTime() != null), eq(4), eq(1));
    }
    @Test void timeoutOnlyCancelsPendingUnpaidOrdersUsingCompareAndSet() {
        com.sky.task.OrderTask task = new com.sky.task.OrderTask();
        org.springframework.test.util.ReflectionTestUtils.setField(task, "orderMapper", orders);
        when(orders.getByStatusAndOrderTimeLT(eq(1), any())).thenReturn(Collections.singletonList(order(1, 0)));
        task.processTimeoutOrder();
        verify(orders).transition(argThat(value -> value.getStatus() == 6 && value.getCancelTime() != null), eq(1), eq(0));
        verify(orders, never()).update(any());
    }
}
