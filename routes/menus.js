import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
  errorFormat: "pretty",
});

// 메뉴 수, 주문 수, 총 매출과 관련된 통계를 반환합니다.
router.get("/stats", async (req, res, next) => {
  try {
    const totalMenus = await prisma.menu.count(); // 메뉴 테이블의 데이터 개수
    const totalOrders = await prisma.orderHistory.count(); // 오더내역 테이블의 데이터 갯수

    // sales를 빈 배열로 저장 할 수도 있기에 let을 사용하여 재할당이 가능하게 한다
    // 오더 내역 테이블에서 모든 데이터를 가져옵니다. 배열로 변수에 저장됩니다
    let sales = await prisma.orderHistory.findMany({
      // include 쓰면 select 를 쓰라고 error가 협박햇다
      // 왜냐면 select는 원하는 필드만 선택적으로 가져오지만
      // include는 모델 관계를 가져올 때 모든 데이터를 가져오는 방식이기 때문에 필요없는 정보도 포함됨

      // 메뉴룰 가져오나 메뉴의 가격도 포함하도록 설정
      select: {
        menu: {
          select: {
            price: true,
          },
        },
      },
    });

    sales = sales || []; // reduce를 돌리기위해선 필수라고 하셨다 null이나 undefined 상태에서는 오류가 발생하기 때문에

    const totalSales = sales.reduce(
      // 배열을 순회하면서 총 매출을 계산한다
      (total, order) => total + order.menu.price, // 콜백함수, 해당 메뉴의 가격을 가져와 누적된 값에 더한다
      0 // 초기값
    );

    return res
      .status(200) // 매뉴 수,    주문 수,     총 매출
      .json({ stats: { totalMenus, totalOrders, totalSales } });
  } catch (error) {
    next(error);
  }
});

// 사용 가능한 메뉴 목록을 반환합니다. totalOrders 데이터도
router.get("/", async (req, res, next) => {
  try {
    // 메뉴 목록
    const findMenu = await prisma.menu.findMany(); //  메뉴 테이블에 있는 모든 데이터를 가져옴, 배열로 변수에 저장됩니다

    const menus = []; //새로운 배열 생성

    for (let i = 0; i < findMenu.length; i++) {
      //findMenu 배열을 반복문으로 순회하면서 각 메뉴를 하나씩 처리

      const menu = findMenu[i]; //menu에 각 메뉴 데이터를 저장

      const totalOrders = await prisma.orderHistory.count({
        where: { menu_id: menu.id }, // 메뉴id 조건을 만들어 메뉴id 기준으로 주문 수 조회
      });

      menus.push({
        // 각 메뉴 데이터와 그 메뉴의 총 주문 수를 menu에 push한다
        ...menu,
        totalOrders,
      });
    }

    res.status(200).json({ menus });
  } catch (error) {
    next(error);
  }
});

export default router;
