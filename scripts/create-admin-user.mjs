import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// SHA-256 hash function using Web Crypto API
async function hashWithSHA256(password, salt) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + salt)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

function generateSalt() {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

async function hashPassword(password) {
  const salt = generateSalt()
  const hash = await hashWithSHA256(password, salt)
  return `${salt}:${hash}`
}

async function createAdminUser() {
  const email = process.env.SUPER_ADMIN_EMAIL
  const password = process.env.SUPER_ADMIN_TEMP_PASSWORD

  if (!email || !password) {
    console.error("Error: SUPER_ADMIN_EMAIL and SUPER_ADMIN_TEMP_PASSWORD environment variables are required")
    process.exit(1)
  }
  
  console.log("Creating admin user...")
  console.log("Email:", email)
  
  // Check if user already exists
  const { data: existingUser, error: fetchError } = await supabase
    .from('User')
    .select('id, role')
    .eq('email', email)
    .limit(1)
    .single()
  
  if (existingUser) {
    console.log("User already exists with ID:", existingUser.id)
    
    const passwordHash = await hashPassword(password)
    
    // Update to admin if not already
    if (existingUser.role !== "ADMIN") {
      await supabase
        .from('User')
        .update({ role: 'ADMIN', passwordHash, updatedAt: new Date().toISOString() })
        .eq('email', email)
      console.log("Updated existing user to ADMIN role with new password")
    } else {
      await supabase
        .from('User')
        .update({ passwordHash, updatedAt: new Date().toISOString() })
        .eq('email', email)
      console.log("Updated admin password")
    }
    
    // Make sure AdminUser entry exists
    const { data: existingAdminUser } = await supabase
      .from('AdminUser')
      .select('id')
      .eq('userId', existingUser.id)
      .limit(1)
      .single()
    
    if (!existingAdminUser) {
      await supabase
        .from('AdminUser')
        .insert({
          id: crypto.randomUUID(),
          userId: existingUser.id,
          firstName: 'Admin',
          lastName: 'User',
          role: 'SUPER_ADMIN',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      console.log("Created AdminUser entry")
    }
    
    return existingUser.id
  }
  
  // Create new user
  const passwordHash = await hashPassword(password)
  const userId = crypto.randomUUID()
  const now = new Date().toISOString()
  
  const { error: insertError } = await supabase
    .from('User')
    .insert({
      id: userId,
      email,
      passwordHash,
      role: 'ADMIN',
      emailVerified: true,
      is_email_verified: true,
      createdAt: now,
      updatedAt: now
    })
  
  if (insertError) {
    throw new Error(`Failed to create user: ${insertError.message}`)
  }
  
  console.log("Created new admin user with ID:", userId)
  
  // Create AdminUser entry
  await supabase
    .from('AdminUser')
    .insert({
      id: crypto.randomUUID(),
      userId,
      firstName: 'Admin',
      lastName: 'User',
      role: 'SUPER_ADMIN',
      createdAt: now,
      updatedAt: now
    })
  
  console.log("Created AdminUser entry")
  console.log("")
  console.log("=== Admin User Created Successfully ===")
  console.log("Email:", email)
  console.log("Role: ADMIN")
  console.log("")
  console.log("You can now log in at /admin/login")
  
  return userId
}

createAdminUser()
  .then(() => {
    console.log("Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Error creating admin user:", error)
    process.exit(1)
  })
