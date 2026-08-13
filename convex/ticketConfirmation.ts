export const BOOKING_CONFIRMATION_SEQUENCE_ERROR = "Save the reservation confirmation number before marking the booking confirmed";
export const BOOKING_CONFIRMATION_CLEAR_ERROR = "A confirmed booking must keep its reservation confirmation number";

export function reservationConfirmationNumber(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeReservationConfirmationNumberPatch(data: any) {
  if (!data || !Object.prototype.hasOwnProperty.call(data, "reservationConfirmationNumber")) return data;
  if (typeof data.reservationConfirmationNumber !== "string") {
    throw new Error("Reservation confirmation number must be a string");
  }
  return { ...data, reservationConfirmationNumber: data.reservationConfirmationNumber.trim() };
}

export function ensureBookingConfirmationSequence(currentTicket: any, targetTicket: any, creating = false, confirmationNumberIncluded = false) {
  const currentStatus = currentTicket?.status;
  const targetStatus = targetTicket?.status;
  const currentNumber = reservationConfirmationNumber(currentTicket?.reservationConfirmationNumber);
  const targetNumber = reservationConfirmationNumber(targetTicket?.reservationConfirmationNumber);

  if (targetStatus === "BOOKING CONFIRMED" && (creating || currentStatus !== "BOOKING CONFIRMED")) {
    if (creating || confirmationNumberIncluded || !currentNumber || targetNumber !== currentNumber) {
      throw new Error(BOOKING_CONFIRMATION_SEQUENCE_ERROR);
    }
  }

  if (currentStatus === "BOOKING CONFIRMED" && targetStatus === "BOOKING CONFIRMED" && !targetNumber) {
    throw new Error(currentNumber ? BOOKING_CONFIRMATION_CLEAR_ERROR : BOOKING_CONFIRMATION_SEQUENCE_ERROR);
  }
}
