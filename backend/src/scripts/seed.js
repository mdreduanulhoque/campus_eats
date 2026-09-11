const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function seed() {
  console.log('--- Starting CampusEats Database Seeding ---');
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Seed Canteens
    console.log('[1/4] Seeding Canteens...');
    const canteensData = [
      { id: 1, name: 'Central Cafeteria', location: 'Main Campus Building A, Ground Floor' },
      { id: 2, name: 'Science Complex Canteen', location: 'Science Building Block C' }
    ];

    for (const c of canteensData) {
      await connection.query(
        `INSERT INTO canteens (id, name, location)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), location = VALUES(location)`,
        [c.id, c.name, c.location]
      );
    }

    // 2. Hash default password
    const defaultPassword = 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // 3. Seed Users across all roles
    console.log('[2/4] Seeding Users with all roles...');
    const usersData = [
      {
        name: 'System Super Admin',
        email: 'superadmin@campuseats.com',
        role: 'super_admin',
        canteen_id: null,
        daily_budget_limit: 0.00,
        loyalty_points: 0
      },
      {
        name: 'Central Admin',
        email: 'admin.central@campuseats.com',
        role: 'local_admin',
        canteen_id: 1,
        daily_budget_limit: 0.00,
        loyalty_points: 0
      },
      {
        name: 'Science Admin',
        email: 'admin.science@campuseats.com',
        role: 'local_admin',
        canteen_id: 2,
        daily_budget_limit: 0.00,
        loyalty_points: 0
      },
      {
        name: 'Central Chef / Staff',
        email: 'kitchen.central@campuseats.com',
        role: 'kitchen_staff',
        canteen_id: 1,
        daily_budget_limit: 0.00,
        loyalty_points: 0
      },
      {
        name: 'Science Chef / Staff',
        email: 'kitchen.science@campuseats.com',
        role: 'kitchen_staff',
        canteen_id: 2,
        daily_budget_limit: 0.00,
        loyalty_points: 0
      },
      {
        name: 'Rahim Ahmed (Student)',
        email: 'student.rahim@campuseats.com',
        role: 'user',
        canteen_id: null,
        daily_budget_limit: 400.00,
        loyalty_points: 30
      },
      {
        name: 'Dr. Tanvir Hasan (Faculty)',
        email: 'faculty.tanvir@campuseats.com',
        role: 'user',
        canteen_id: null,
        daily_budget_limit: 800.00,
        loyalty_points: 85
      }
    ];

    for (const u of usersData) {
      await connection.query(
        `INSERT INTO users (name, email, password_hash, role, canteen_id, daily_budget_limit, loyalty_points)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
            name = VALUES(name),
            password_hash = VALUES(password_hash),
            role = VALUES(role),
            canteen_id = VALUES(canteen_id),
            daily_budget_limit = VALUES(daily_budget_limit),
            loyalty_points = VALUES(loyalty_points)`,
        [u.name, u.email, passwordHash, u.role, u.canteen_id, u.daily_budget_limit, u.loyalty_points]
      );
    }

    // 4. Seed Menu Items
    console.log('[3/4] Seeding Menu Items...');
    const menuData = [
      // Central Cafeteria (canteen_id: 1)
      {
        canteen_id: 1,
        name: 'Chicken Khichuri',
        description: 'Aromatic fragrant rice and lentils cooked with tender spiced chicken',
        price: 180.00,
        image_url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop',
        est_prep_time_mins: 15,
        is_available: true
      },
      {
        canteen_id: 1,
        name: 'Beef Tehari',
        description: 'Authentic mustard oil beef tehari served with fresh sliced cucumber',
        price: 220.00,
        image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop',
        est_prep_time_mins: 12,
        is_available: true
      },
      {
        canteen_id: 1,
        name: 'Egg Fried Rice with Crispy Chicken',
        description: 'Chinese style egg wok rice accompanied by a large crispy fried chicken piece',
        price: 160.00,
        image_url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop',
        est_prep_time_mins: 10,
        is_available: true
      },
      {
        canteen_id: 1,
        name: 'Singara (2 Pieces)',
        description: 'Crispy deep-fried savory pastry stuffed with spiced potato and peanut filling',
        price: 20.00,
        image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop',
        est_prep_time_mins: 3,
        is_available: true
      },
      {
        canteen_id: 1,
        name: 'Special Milk Tea',
        description: 'Rich cardamon-infused brewed tea made with thick creamy milk',
        price: 15.00,
        image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop',
        est_prep_time_mins: 5,
        is_available: true
      },

      // Science Canteen (canteen_id: 2)
      {
        canteen_id: 2,
        name: 'Crispy Chicken Burger',
        description: 'Golden fried chicken breast fillet with melted cheese, lettuce, and house mayonnaise',
        price: 140.00,
        image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop',
        est_prep_time_mins: 10,
        is_available: true
      },
      {
        canteen_id: 2,
        name: 'Grilled Chicken Sub Sandwich',
        description: 'Toasted baguette stuffed with seasoned grilled chicken shreds and capsicum',
        price: 150.00,
        image_url: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=500&auto=format&fit=crop',
        est_prep_time_mins: 12,
        is_available: true
      },
      {
        canteen_id: 2,
        name: 'Club Sandwich',
        description: 'Layered toasted sandwich with egg, seasoned chicken, cheese and fresh tomato',
        price: 120.00,
        image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop',
        est_prep_time_mins: 8,
        is_available: true
      },
      {
        canteen_id: 2,
        name: 'Iced Cold Coffee',
        description: 'Blended chilled espresso with ice cream and chocolate drizzle',
        price: 90.00,
        image_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop',
        est_prep_time_mins: 5,
        is_available: true
      }
    ];

    for (const m of menuData) {
      // Avoid inserting duplicates if already matching canteen_id and name
      const [existing] = await connection.query(
        `SELECT id FROM menu_items WHERE canteen_id = ? AND name = ?`,
        [m.canteen_id, m.name]
      );
      if (existing.length === 0) {
        await connection.query(
          `INSERT INTO menu_items (canteen_id, name, description, price, image_url, est_prep_time_mins, is_available)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [m.canteen_id, m.name, m.description, m.price, m.image_url, m.est_prep_time_mins, m.is_available]
        );
      }
    }

    await connection.commit();
    console.log('[4/4] Commit successful! Seeding completed.');
    console.log('\n--- Default Seeded Accounts (Password for all: password123) ---');
    console.log('1. Super Admin:    superadmin@campuseats.com');
    console.log('2. Central Admin:  admin.central@campuseats.com (Canteen: 1)');
    console.log('3. Science Admin:  admin.science@campuseats.com (Canteen: 2)');
    console.log('4. Kitchen Staff:  kitchen.central@campuseats.com (Canteen: 1)');
    console.log('5. Student User:   student.rahim@campuseats.com (Budget: 400 BDT, Points: 30)');
    console.log('6. Faculty User:   faculty.tanvir@campuseats.com (Budget: 800 BDT, Points: 85)');
    console.log('------------------------------------------------------------\n');

  } catch (error) {
    await connection.rollback();
    console.error('Seeding error:', error);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seed;
