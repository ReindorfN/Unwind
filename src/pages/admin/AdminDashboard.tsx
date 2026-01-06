import { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  FileText, 
  BarChart,
  Search,
  Filter,
  Calendar,
  Award,
  AlertTriangle,
  ExternalLink,
  UserCog,
  Flag,
  Activity,
  Layers,
  PieChart,
  TrendingUp,
  MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import SectionHeading from '../../components/common/SectionHeading';

interface TherapistApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  specialization: string;
  license_number: string;
  license_state: string;
  years_experience: number;
  education: string;
  certifications: string[];
  certificate_image_url?: string;
  application_status: 'pending' | 'under_review' | 'approved' | 'rejected';
  admin_notes?: string;
  submitted_at: string;
  reviewed_at?: string;
}

interface DashboardStats {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  verifiedTherapists: number;
  totalUsers: number;
  totalPosts: number;
  totalReports: number;
}

const AdminDashboard = () => {
  const { user } = useAuthStore();
  const [applications, setApplications] = useState<TherapistApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<TherapistApplication[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    verifiedTherapists: 0,
    totalUsers: 0,
    totalPosts: 0,
    totalReports: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<TherapistApplication | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reportAction, setReportAction] = useState<'resolve' | 'dismiss'>('resolve');
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'applications' | 'users' | 'reports' | 'analytics'>('applications');

  useEffect(() => {
    document.title = 'Admin Dashboard | Unwind';
    if (user?.role === 'admin') {
      loadApplications();
      loadUsers();
    }
  }, [user]);

  useEffect(() => {
    filterApplications();
  }, [applications, searchQuery, statusFilter]);
  
  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, userRoleFilter]);
  
  useEffect(() => {
    filterReports();
  }, [reports, searchQuery, reportStatusFilter]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      
      // First, check if the view exists by trying to select from it
      const { data: viewData, error: viewError } = await supabase
        .from('therapist_applications')
        .select(`
          id,
          user_id,
          specialization,
          license_number,
          license_state,
          years_experience,
          education,
          certifications,
          certificate_image_url,
          application_status,
          admin_notes,
          submitted_at,
          reviewed_at,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order('submitted_at', { ascending: false });

      if (viewError) throw viewError;
      
      // Transform the data to match the expected format
      const formattedData = (viewData || []).map(app => ({
        id: app.id,
        user_id: app.user_id,
        full_name: app.profiles?.full_name || 'Unknown',
        email: app.profiles?.email || 'unknown@example.com',
        specialization: app.specialization,
        license_number: app.license_number,
        license_state: app.license_state,
        years_experience: app.years_experience,
        education: app.education,
        certifications: app.certifications,
        certificate_image_url: app.certificate_image_url,
        application_status: app.application_status,
        admin_notes: app.admin_notes,
        submitted_at: app.submitted_at,
        reviewed_at: app.reviewed_at
      }));
      
      setApplications(formattedData);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };




  const filterApplications = () => {
    let filtered = [...applications];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app =>
        app.full_name.toLowerCase().includes(query) ||
        app.email.toLowerCase().includes(query) ||
        app.specialization.toLowerCase().includes(query) ||
        app.license_number.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.application_status === statusFilter);
    }

    setFilteredApplications(filtered);
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (userRoleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === userRoleFilter);
    }

    setFilteredUsers(filtered);
  };

  const filterReports = () => {
    let filtered = [...reports];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(report =>
        report.reporter_name.toLowerCase().includes(query) ||
        report.reason.toLowerCase().includes(query) ||
        report.content_preview.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (reportStatusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === reportStatusFilter);
    }

    setFilteredReports(filtered);
  };

  const handleReviewApplication = (application: TherapistApplication, action: 'approve' | 'reject') => {
    setSelectedApplication(application);
    setReviewAction(action);
    setAdminNotes('');
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!selectedApplication) return;

    // First, set the application to under review
    try {
      await supabase.rpc('set_application_under_review', {
        application_id: selectedApplication.id
      });
    } catch (error) {
      console.error('Error setting application under review:', error);
      // Continue with the review process even if this fails
    }

    try {
      setProcessing(true);

      if (reviewAction === 'approve') {
        const { data, error } = await supabase.rpc('approve_therapist_application', {
          application_id: selectedApplication.id
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.rpc('reject_therapist_application', {
          application_id: selectedApplication.id,
          rejection_reason: adminNotes || 'Application rejected by administrator'
        });
        if (error) throw error;
      }

      // Reload data
      await loadApplications();
      await loadStats();

      // Close modal
      setShowReviewModal(false);
      setSelectedApplication(null);
      setAdminNotes('');

    } catch (error) {
      console.error('Error processing application:', error);
      alert('Error processing application. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  const handleReportAction = async (action: 'resolve' | 'dismiss') => {
    if (!selectedReport) return;

    try {
      setProcessing(true);
      
      // In a real app, this would update the database
      // For now, we'll just update the local state
      const updatedReports = reports.map(report => 
        report.id === selectedReport.id 
          ? { ...report, status: action === 'resolve' ? 'resolved' : 'dismissed' } 
          : report
      );
      
      setReports(updatedReports);
      filterReports();
      
      // Close modal
      setShowReportModal(false);
      setSelectedReport(null);
      
    } catch (error) {
      console.error('Error processing report:', error);
      alert('Error processing report. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning-100 text-warning-700';
      case 'under_review': return 'bg-primary-100 text-primary-700';
      case 'approved': return 'bg-success-100 text-success-700';
      case 'rejected': return 'bg-error-100 text-error-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getReportStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning-100 text-warning-700';
      case 'reviewed': return 'bg-primary-100 text-primary-700';
      case 'resolved': return 'bg-success-100 text-success-700';
      case 'dismissed': return 'bg-neutral-100 text-neutral-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getReportStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={16} />;
      case 'reviewed': return <Eye size={16} />;
      case 'resolved': return <CheckCircle size={16} />;
      case 'dismissed': return <XCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={16} />;
      case 'under_review': return <Eye size={16} />;
      case 'approved': return <CheckCircle size={16} />;
      case 'rejected': return <XCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const formatActivityType = (type: string) => {
    switch (type) {
      case 'mood_entry': return 'Mood Tracked';
      case 'journal_entry': return 'Journal Entry';
      case 'forum_post': return 'Forum Post';
      case 'forum_comment': return 'Forum Comment';
      case 'rant_session': return 'AI Companion';
      default: return type;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'mood_entry': return <TrendingUp size={16} className="text-primary-500" />;
      case 'journal_entry': return <FileText size={16} className="text-secondary-500" />;
      case 'forum_post': return <MessageCircle size={16} className="text-accent-500" />;
      case 'forum_comment': return <MessageCircle size={16} className="text-accent-500" />;
      case 'rant_session': return <Activity size={16} className="text-primary-500" />;
      default: return <Activity size={16} className="text-neutral-500" />;
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertTriangle className="mx-auto text-error-500 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Access Denied</h1>
          <p className="text-neutral-600">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SectionHeading
        title="Admin Dashboard"
        subtitle="Manage therapist applications and platform administration"
        className="mb-6"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"> 
        {/* <Card className="p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
              <Users className="text-primary-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{stats.totalUsers}</p>
              <p className="text-sm text-neutral-600">Total Users</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-secondary-100 flex items-center justify-center mr-3">
              <Award className="text-secondary-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{stats.verifiedTherapists}</p>
              <p className="text-sm text-neutral-600">Therapists</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-accent-100 flex items-center justify-center mr-3">
              <MessageCircle className="text-accent-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{stats.totalPosts}</p>
              <p className="text-sm text-neutral-600">Forum Posts</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-warning-100 flex items-center justify-center mr-3">
              <Flag className="text-warning-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-900">{stats.totalReports}</p>
              <p className="text-sm text-neutral-600">Reports</p>
            </div>
          </div>
        </Card> */}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-200 mb-6">
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2 font-medium text-sm border-b-2 ${
            activeTab === 'applications'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <div className="flex items-center">
            <Award size={16} className="mr-2" />
            <span>Therapist Applications</span>
          </div>
        </button>
        {/* <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 font-medium text-sm border-b-2 ${
            activeTab === 'users'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <div className="flex items-center">
            <UserCog size={16} className="mr-2" />
            <span>User Management</span>
          </div>
        </button> */}
        {/* <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 font-medium text-sm border-b-2 ${
            activeTab === 'reports'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <div className="flex items-center">
            <Flag size={16} className="mr-2" />
            <span>Reports</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 font-medium text-sm border-b-2 ${
            activeTab === 'analytics'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <div className="flex items-center">
            <BarChart size={16} className="mr-2" />
            <span>Analytics</span>
          </div>
        </button> */} 
      </div>

      
      {/* Therapist Applications Tab */}
      {activeTab === 'applications' && (
        <>
          {/* Filters */}
          <Card className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-neutral-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Applications List */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Applicant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Specialization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      License
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Experience
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {filteredApplications.map((application) => (
                    <tr key={application.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-neutral-900">
                            {application.full_name}
                          </div>
                          <div className="text-sm text-neutral-500">
                            {application.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-900">{application.specialization}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-900">
                          {application.license_number}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {application.license_state}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-900">
                          {application.years_experience} years
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.application_status)}`}>
                          {getStatusIcon(application.application_status)}
                          <span className="ml-1 capitalize">{application.application_status.replace('_',  ' ')}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                        {format(new Date(application.submitted_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedApplication(application)}
                            className="text-primary-600 hover:text-primary-900"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          {application.application_status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleReviewApplication(application, 'approve')}
                                className="text-success-600 hover:text-success-900"
                                title="Approve Application"
                              >
                                <UserCheck size={18} />
                              </button>
                              <button
                                onClick={() => handleReviewApplication(application, 'reject')}
                                className="text-error-600 hover:text-error-900"
                                title="Reject Application"
                              >
                                <UserX size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredApplications.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-neutral-500">
                        No applications found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Application Details Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full my-8">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900">
                  Therapist Application Details
                </h2>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Applicant Information</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-neutral-500">Full Name</p>
                      <p className="font-medium">{selectedApplication.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Email</p>
                      <p className="font-medium">{selectedApplication.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Specialization</p>
                      <p className="font-medium">{selectedApplication.specialization}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Years of Experience</p>
                      <p className="font-medium">{selectedApplication.years_experience} years</p>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold mt-6 mb-4">License Information</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-neutral-500">License Number</p>
                      <p className="font-medium">{selectedApplication.license_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">License State</p>
                      <p className="font-medium">{selectedApplication.license_state}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Education & Certifications</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-neutral-500">Education</p>
                      <p className="font-medium whitespace-pre-wrap">{selectedApplication.education}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Certifications</p>
                      {selectedApplication.certifications && selectedApplication.certifications.length > 0 ? (
                        <ul className="list-disc list-inside">
                          {selectedApplication.certifications.map((cert, index) => (
                            <li key={index} className="font-medium">{cert}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-neutral-500">No certifications provided</p>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold mt-6 mb-4">Certificate</h3>
                  {selectedApplication.certificate_image_url ? (
                    <div>
                      <a 
                        href={selectedApplication.certificate_image_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-primary-600 hover:text-primary-800 transition-colors"
                      >
                        <FileText size={18} className="mr-2" />
                        <span>View Certificate</span>
                        <ExternalLink size={14} className="ml-1" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-neutral-500">No certificate uploaded</p>
                  )}

                  <h3 className="text-lg font-semibold mt-6 mb-4">Application Status</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-neutral-500">Current Status</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusColor(selectedApplication.application_status)}`}>
                        {getStatusIcon(selectedApplication.application_status)}
                        <span className="ml-1 capitalize">{selectedApplication.application_status.replace('_', ' ')}</span>
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Submitted On</p>
                      <p className="font-medium">
                        {format(new Date(selectedApplication.submitted_at), 'MMMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    {selectedApplication.reviewed_at && (
                      <div>
                        <p className="text-sm text-neutral-500">Reviewed On</p>
                        <p className="font-medium">
                          {format(new Date(selectedApplication.reviewed_at), 'MMMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    )}
                    {selectedApplication.admin_notes && (
                      <div>
                        <p className="text-sm text-neutral-500">Admin Notes</p>
                        <p className="font-medium whitespace-pre-wrap">{selectedApplication.admin_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-200 flex justify-between">
              <Button
                variant="outline"
                onClick={() => setSelectedApplication(null)}
              >
                Close
              </Button>
              
              {selectedApplication.application_status === 'pending' && (
                <div className="flex space-x-3">
                  <Button
                    variant="error"
                    onClick={() => handleReviewApplication(selectedApplication, 'reject')}
                    icon={<UserX size={18} />}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleReviewApplication(selectedApplication, 'approve')}
                    icon={<UserCheck size={18} />}
                  >
                    Approve
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full my-8">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900">
                  User Details
                </h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden mr-4">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt={selectedUser.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <Users size={32} className="text-neutral-500" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">{selectedUser.full_name || 'Unnamed User'}</h3>
                  <div className="flex items-center mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      selectedUser.role === 'admin' 
                        ? 'bg-error-100 text-error-700' 
                        : selectedUser.role === 'therapist' 
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      {selectedUser.role === 'admin' && <Shield size={12} className="mr-1" />}
                      {selectedUser.role === 'therapist' && <Award size={12} className="mr-1" />}
                      {selectedUser.role === 'user' && <User size={12} className="mr-1" />}
                      <span className="capitalize">{selectedUser.role}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-neutral-900 mb-3">Account Information</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-neutral-500">Email</p>
                      <p className="font-medium">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Account Created</p>
                      <p className="font-medium">{format(new Date(selectedUser.created_at), 'MMMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Last Updated</p>
                      <p className="font-medium">{format(new Date(selectedUser.updated_at), 'MMMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Email Verification</p>
                      <div className="flex items-center">
                        {selectedUser.email_verified ? (
                          <>
                            <CheckCircle size={16} className="text-success-500 mr-2" />
                            <span className="text-success-700">Verified</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={16} className="text-warning-500 mr-2" />
                            <span className="text-warning-700">Not Verified</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedUser.role === 'therapist' && (
                  <div>
                    <h4 className="font-medium text-neutral-900 mb-3">Therapist Information</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-neutral-500">Verification Status</p>
                        <div className="flex items-center">
                          {selectedUser.therapist_verified ? (
                            <>
                              <CheckCircle size={16} className="text-success-500 mr-2" />
                              <span className="text-success-700">Verified</span>
                            </>
                          ) : (
                            <>
                              <Clock size={16} className="text-warning-500 mr-2" />
                              <span className="text-warning-700">Pending Verification</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-neutral-200 flex justify-between">
              <Button
                variant="outline"
                onClick={() => setShowUserModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Report Details Modal */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full my-8">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900">
                  Report Details
                </h2>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-500">Report ID</span>
                  <span className="text-sm font-medium">{selectedReport.id}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-500">Reported By</span>
                  <span className="text-sm font-medium">{selectedReport.reporter_name}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-500">Content Type</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedReport.type === 'post' 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'bg-secondary-100 text-secondary-700'
                  }`}>
                    {selectedReport.type === 'post' ? 'Forum Post' : 'Forum Comment'}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-500">Status</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getReportStatusColor(selectedReport.status)}`}>
                    {getReportStatusIcon(selectedReport.status)}
                    <span className="ml-1 capitalize">{selectedReport.status}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-500">Reported On</span>
                  <span className="text-sm font-medium">{format(new Date(selectedReport.created_at), 'MMMM d, yyyy h:mm a')}</span>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-medium text-neutral-900 mb-2">Reason for Report</h3>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-700">{selectedReport.reason}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-medium text-neutral-900 mb-2">Reported Content</h3>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-700">{selectedReport.content_preview}</p>
                </div>
              </div>

              {selectedReport.status === 'pending' && (
                <div className="mb-6">
                  <h3 className="font-medium text-neutral-900 mb-2">Take Action</h3>
                  <div className="p-4 bg-neutral-50 rounded-lg">
                    <p className="text-sm text-neutral-600 mb-4">
                      Please review the reported content and take appropriate action.
                    </p>
                    <div className="flex space-x-3">
                      <Button
                        variant="error"
                        onClick={() => handleReportAction('dismiss')}
                        icon={<XCircle size={18} />}
                      >
                        Dismiss Report
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => handleReportAction('resolve')}
                        icon={<CheckCircle size={18} />}
                      >
                        Resolve & Remove Content
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-neutral-200">
              <Button
                variant="outline"
                onClick={() => setShowReportModal(false)}
                fullWidth
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Application Details Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full my-8">
            <div className="p-6 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900">
                  Therapist Application Details
                </h2>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Applicant Information</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-neutral-500">Full Name</p>
                      <p className="font-medium">{selectedApplication.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Email</p>
                      <p className="font-medium">{selectedApplication.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Specialization</p>
                      <p className="font-medium">{selectedApplication.specialization}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Years of Experience</p>
                      <p className="font-medium">{selectedApplication.years_experience} years</p>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold mt-6 mb-4">License Information</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-neutral-500">License Number</p>
                      <p className="font-medium">{selectedApplication.license_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">License State</p>
                      <p className="font-medium">{selectedApplication.license_state}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Education & Certifications</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-neutral-500">Education</p>
                      <p className="font-medium whitespace-pre-wrap">{selectedApplication.education}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Certifications</p>
                      {selectedApplication.certifications && selectedApplication.certifications.length > 0 ? (
                        <ul className="list-disc list-inside">
                          {selectedApplication.certifications.map((cert, index) => (
                            <li key={index} className="font-medium">{cert}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-neutral-500">No certifications provided</p>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold mt-6 mb-4">Certificate</h3>
                  {selectedApplication.certificate_image_url ? (
                    <div>
                      <a 
                        href={selectedApplication.certificate_image_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center text-primary-600 hover:text-primary-800 transition-colors"
                      >
                        <FileText size={18} className="mr-2" />
                        <span>View Certificate</span>
                        <ExternalLink size={14} className="ml-1" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-neutral-500">No certificate uploaded</p>
                  )}

                  <h3 className="text-lg font-semibold mt-6 mb-4">Application Status</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-neutral-500">Current Status</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusColor(selectedApplication.application_status)}`}>
                        {getStatusIcon(selectedApplication.application_status)}
                        <span className="ml-1 capitalize">{selectedApplication.application_status.replace('_', ' ')}</span>
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Submitted On</p>
                      <p className="font-medium">
                        {format(new Date(selectedApplication.submitted_at), 'MMMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    {selectedApplication.reviewed_at && (
                      <div>
                        <p className="text-sm text-neutral-500">Reviewed On</p>
                        <p className="font-medium">
                          {format(new Date(selectedApplication.reviewed_at), 'MMMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    )}
                    {selectedApplication.admin_notes && (
                      <div>
                        <p className="text-sm text-neutral-500">Admin Notes</p>
                        <p className="font-medium whitespace-pre-wrap">{selectedApplication.admin_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-200 flex justify-between">
              <Button
                variant="outline"
                onClick={() => setSelectedApplication(null)}
              >
                Close
              </Button>
              
              {selectedApplication.application_status === 'pending' && (
                <div className="flex space-x-3">
                  <Button
                    variant="error"
                    onClick={() => handleReviewApplication(selectedApplication, 'reject')}
                    icon={<UserX size={18} />}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleReviewApplication(selectedApplication, 'approve')}
                    icon={<UserCheck size={18} />}
                  >
                    Approve
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="p-6 border-b border-neutral-200">
              <h3 className="text-xl font-semibold text-neutral-900">
                {reviewAction === 'approve' ? 'Approve Application' : 'Reject Application'}
              </h3>
            </div>

            <div className="p-6">
              <p className="mb-4">
                {reviewAction === 'approve'
                  ? `Are you sure you want to approve ${selectedApplication.full_name}'s application? This will grant them access to the therapist features of the platform.`
                  : `Are you sure you want to reject ${selectedApplication.full_name}'s application? Please provide a reason for the rejection.`
                }
              </p>

              {reviewAction === 'reject' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Reason for Rejection
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    rows={4}
                    placeholder="Provide a reason for rejecting this application..."
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowReviewModal(false)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant={reviewAction === 'approve' ? 'primary' : 'error'}
                  onClick={submitReview}
                  disabled={processing || (reviewAction === 'reject' && !adminNotes.trim())}
                  icon={reviewAction === 'approve' ? <UserCheck size={18} /> : <UserX size={18} />}
                >
                  {processing
                    ? 'Processing...'
                    : reviewAction === 'approve'
                      ? 'Confirm Approval'
                      : 'Confirm Rejection'
                  }
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;