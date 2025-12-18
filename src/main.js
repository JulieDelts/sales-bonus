/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  const discount = 1 - purchase.discount / 100;
  return discount * purchase.quantity * purchase.sale_price;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  const topBonus = 0.15;
  const secondTopBonus = 0.1;
  const regularBonus = 0.05;

  if (index == 0) {
    return seller.profit * topBonus;
  } else if (index == 1 || index == 2) {
    return seller.profit * secondTopBonus;
  } else if (index == total - 1) {
    return 0;
  } else {
    return seller.profit * regularBonus;
  }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  if (data) {
    let isInObjectForm =
      Array.isArray(data.sellers) &&
      Array.isArray(data.products) &&
      Array.isArray(data.purchase_records);
    let isNotEmpty =
      data.sellers.length > 0 &&
      data.products.length > 0 &&
      data.purchase_records.length > 0;

    if (!isInObjectForm || !isNotEmpty) {
      throw new Error("Некорректные входные данные");
    }
  } else throw new Error("Некорректные входные данные");

  if (typeof options !== "object") throw new Error("Чего-то не хватает");

  const { calculateRevenue, calculateBonus } = options;

  if (
    !calculateRevenue ||
    typeof calculateRevenue !== "function" ||
    !calculateBonus ||
    typeof calculateBonus !== "function"
  )
    throw new Error("Чего-то не хватает");

  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  const sellerIndex = Object.fromEntries(
    sellerStats.map((stat) => [stat.id, stat])
  );
  const productIndex = Object.fromEntries(
    data.products.map((product) => [product.sku, product])
  );

  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];
    seller.sales_count++;
    seller.revenue += record.total_amount - record.total_discount;

    record.items.forEach((item) => {
      const product = productIndex[item.sku];
      const cost = product.purchase_price * item.quantity;
      const revenue = calculateRevenue(item, product);
      const profit = revenue - cost;
      seller.profit += profit;

      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = item.quantity;
      } else seller.products_sold[item.sku] += item.quantity;
    });
  });

  const compareProfit = (sellerX, sellerY) => sellerY.profit - sellerX.profit;
  sellerStats.sort(compareProfit);

  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonusByProfit(index, sellerStats.length, seller);
    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((productX, productY) => productY.quantity - productX.quantity)
      .slice(0, 10);
  });

  return sellerStats.map((seller) => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }));
}
