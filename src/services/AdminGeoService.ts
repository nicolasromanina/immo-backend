import AdminGeoAssignment from '../models/AdminGeoAssignment';

export class AdminGeoService {
  /**
   * Assign admin to countries/cities
   */
  static async assignAdmin(data: {
    adminId: string;
    countries: string[];
    cities?: string[];
    role: string;
  }) {
    const existing = await AdminGeoAssignment.findOne({
      admin: data.adminId,
      role: data.role,
    });

    if (existing) {
      existing.countries = data.countries;
      existing.cities = data.cities || [];
      await existing.save();
      return existing;
    }

    return AdminGeoAssignment.create({
      admin: data.adminId,
      countries: data.countries,
      cities: data.cities || [],
      role: data.role,
    });
  }

  /**
   * Get admin for a country/city
   */
  static async getAdminForLocation(country: string, city?: string, role?: string) {
    const query: any = { countries: country, isActive: true };
    if (role) query.role = role;

    const assignments = await AdminGeoAssignment.find(query)
      .populate('admin', 'email firstName lastName');

    if (city) {
      const cityMatch = assignments.filter(a => a.cities.length === 0 || a.cities.includes(city));
      return cityMatch.length > 0 ? cityMatch : assignments;
    }

    return assignments;
  }

  /**
   * Get all assignments
   */
  static async getAllAssignments() {
    return AdminGeoAssignment.find({ isActive: true })
      .populate('admin', 'email firstName lastName')
      .sort({ countries: 1, role: 1 });
  }

  /**
   * Remove assignment
   */
  static async removeAssignment(assignmentId: string) {
    return AdminGeoAssignment.findByIdAndUpdate(assignmentId, { isActive: false }, { new: true });
  }
}
